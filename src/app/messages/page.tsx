"use client";

import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMessages } from "@/hooks/useMessages";
import { useWingRequests } from "@/hooks/useWingRequests";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { ProfileIncompleteNotice } from "@/components/ui/ProfileIncompleteNotice";
import {
  fetchWingStatusesAction, renameMessageGroupAction,
  updateGroupPhotoAction, deleteGroupAction, removeGroupMemberAction,
  leaveGroupAction, addGroupMembersWithHistoryAction,
  fetchPinnedMessagesAction,
} from "@/actions/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicProfile, WingStatus, MessageGroup, Message } from "@/types";
import { WING_STATUS_LABELS, WING_STATUS_COLORS } from "@/types";
import { formatRelative } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";

type ChatTarget = { type: "dm"; userId: string } | { type: "group"; groupId: string };
type ConvoTab = "all" | "groups" | "dms" | "archived";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];
const TENOR_KEY = "AIzaSyDDAz10frjurU4YHrqFYc67hHsUFMmnXFQ";

// ─── Helpers ─────────────────────────────────────────
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return d.toLocaleDateString("fr-FR", { weekday: "long" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}
function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function isSameMinuteAndUser(a: Message, b: Message): boolean {
  if (a.fromUserId !== b.fromUserId) return false;
  const tA = new Date(a.createdAt).getTime();
  const tB = new Date(b.createdAt).getTime();
  return Math.abs(tA - tB) < 120000; // 2 min window
}

// ─── Emoji Picker (compact) ─────────────────────────
const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🥳","🥸","😎","🤓","🧐"],
  "Gestes": ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪"],
  "Coeurs": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","💟"],
  "Objets": ["🔥","⭐","✨","💫","🎉","🎊","🏆","🥇","🥈","🥉","🎯","🎮","🎲","🎵","🎶","💯","💢","💥","💦","💨","🕐","💡","📱","💻","📸","🎬","📚","✈️","🚀","⚡"],
};

export default function MessagesPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const {
    conversations, groups, unreadCounts, currentMessages, loaded, totalUnread,
    archivedIds, typingUsers,
    openConversation, openGroupChat, send, createGroup, refresh,
    sendTypingIndicator,
    toggleReaction, editMsg, deleteMsg, pinMsg, unpinMsg,
    searchMsgs, forwardMsg,
    archiveChat, unarchiveChat,
    uploadAttachment,
  } = useMessages();
  const { wingProfiles } = useWingRequests();
  const { isProfileComplete } = usePublicProfile();

  const toast = useToast();
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [wingStatuses, setWingStatuses] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const prevMessageCount = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<ConvoTab>("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Group settings modal
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Add members modal
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [showHistoryToNew, setShowHistoryToNew] = useState(true);

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Edit state
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");

  // Context menu
  const [contextMsg, setContextMsg] = useState<Message | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);

  // Reaction picker
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  // Search in chat
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  // Forward modal
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);

  // Pinned messages
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

  // GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<any[]>([]);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image preview lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Group photo upload
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);

  const wingUserIds = useMemo(() => wingProfiles.map((p) => p.userId), [wingProfiles]);

  // Fetch wing statuses
  useEffect(() => {
    if (wingUserIds.length === 0) return;
    const fetchStatuses = () => fetchWingStatusesAction(wingUserIds).then(setWingStatuses);
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [wingUserIds.join(",")]);

  // Auto-scroll
  useEffect(() => {
    const isNewConversation = prevMessageCount.current === 0 && currentMessages.length > 0;
    const isNewMessage = currentMessages.length > prevMessageCount.current && prevMessageCount.current > 0;
    prevMessageCount.current = currentMessages.length;
    if (isNewConversation) {
      chatEndRef.current?.scrollIntoView({ behavior: "instant" });
      shouldAutoScroll.current = true;
    } else if (isNewMessage && shouldAutoScroll.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMsg) return;
    const handler = () => { setContextMsg(null); setContextPos(null); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMsg]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [chatInput, editInput]);

  const getProfileFor = (uid: string): PublicProfile | undefined =>
    wingProfiles.find((p) => p.userId === uid);

  const handleOpenDm = (uid: string) => {
    prevMessageCount.current = 0;
    shouldAutoScroll.current = true;
    setChatTarget({ type: "dm", userId: uid });
    openConversation(uid);
  };

  const handleOpenGroup = (groupId: string) => {
    prevMessageCount.current = 0;
    shouldAutoScroll.current = true;
    setChatTarget({ type: "group", groupId });
    openGroupChat(groupId);
  };

  const handleSend = async () => {
    if (!chatInput.trim() && !replyTo) return;
    if (!chatTarget) return;
    const content = chatInput.trim();
    setChatInput("");

    const opts: any = {};
    if (replyTo) {
      opts.replyToId = replyTo.id;
      opts.replyPreview = replyTo.content?.slice(0, 100);
      setReplyTo(null);
    }

    let id: string | null = null;
    if (chatTarget.type === "dm") {
      id = await send(chatTarget.userId, null, content, opts);
    } else {
      id = await send(null, chatTarget.groupId, content, opts);
    }
    if (!id) {
      setChatInput(content);
      toast.show("Erreur lors de l'envoi", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingMsg || !editInput.trim()) return;
    const ok = await editMsg(editingMsg.id, editInput.trim());
    if (ok) {
      toast.show("Message modifie");
      setEditingMsg(null);
      setEditInput("");
    }
  };

  const [creatingGroup, setCreatingGroup] = useState(false);
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const id = await createGroup(groupName, selectedMembers);
      if (id) {
        setShowCreateGroup(false);
        setGroupName("");
        setSelectedMembers([]);
        toast.show("Groupe cree !", "success");
      } else {
        toast.show("Erreur", "error");
      }
    } catch {
      toast.show("Erreur", "error");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatTarget) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.show("Image trop lourde (max 5MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const url = await uploadAttachment(base64, "image");
      if (url) {
        if (chatTarget.type === "dm") {
          await send(chatTarget.userId, null, "", { attachmentUrl: url, attachmentType: "image" });
        } else {
          await send(null, chatTarget.groupId, "", { attachmentUrl: url, attachmentType: "image" });
        }
      } else {
        toast.show("Erreur upload", "error");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setShowAttachMenu(false);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const url = await uploadAttachment(base64, "voice");
          if (url && chatTarget) {
            if (chatTarget.type === "dm") {
              await send(chatTarget.userId, null, "Message vocal", { attachmentUrl: url, attachmentType: "voice" });
            } else {
              await send(null, chatTarget.groupId, "Message vocal", { attachmentUrl: url, attachmentType: "voice" });
            }
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.show("Micro non disponible", "error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  // GIF search
  const searchGifs = async (q: string) => {
    if (!q.trim()) { setGifResults([]); return; }
    try {
      const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=20&media_filter=tinygif`);
      const data = await res.json();
      setGifResults(data.results || []);
    } catch { setGifResults([]); }
  };

  const sendGif = async (gifUrl: string) => {
    if (!chatTarget) return;
    setShowGifPicker(false);
    if (chatTarget.type === "dm") {
      await send(chatTarget.userId, null, "", { attachmentUrl: gifUrl, attachmentType: "gif" });
    } else {
      await send(null, chatTarget.groupId, "", { attachmentUrl: gifUrl, attachmentType: "gif" });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchMsgs(searchQuery);
    setSearchResults(results);
  };

  const loadPinned = async () => {
    if (!chatTarget) return;
    const type = chatTarget.type === "dm" ? "dm" : "group";
    const id = chatTarget.type === "dm" ? chatTarget.userId : chatTarget.groupId;
    const msgs = await fetchPinnedMessagesAction(type, id);
    setPinnedMessages(msgs);
    setShowPinned(true);
  };

  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || chatTarget?.type !== "group") return;

    // Compress image via canvas (max 400x400, JPEG 0.7)
    const img = new window.Image();
    img.onload = async () => {
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      const ok = await updateGroupPhotoAction(chatTarget.groupId, compressed);
      if (ok) { toast.show("Photo mise a jour"); refresh(); }
      else toast.show("Erreur", "error");
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const getChatTitle = (): string => {
    if (!chatTarget) return "";
    if (chatTarget.type === "dm") {
      const p = getProfileFor(chatTarget.userId);
      return p?.firstName || p?.username || "Wing";
    }
    const group = groups.find((g) => g.id === chatTarget.groupId);
    if (group?.name) return group.name;
    const memberNames = (group?.memberIds || [])
      .filter((id: string) => id !== userId)
      .map((id: string) => getProfileFor(id)?.firstName || "?")
      .join(", ");
    return memberNames || "Groupe";
  };

  const currentGroup = chatTarget?.type === "group" ? groups.find((g) => g.id === chatTarget.groupId) : null;
  const isGroupCreator = currentGroup?.createdBy === userId;

  // Typing indicator text
  const typingText = useMemo(() => {
    const typing = Object.entries(typingUsers).filter(([, v]) => v).map(([uid]) => {
      const p = getProfileFor(uid);
      return p?.firstName || "Quelqu'un";
    });
    if (typing.length === 0) return null;
    if (typing.length === 1) return `${typing[0]} ecrit...`;
    return `${typing.join(", ")} ecrivent...`;
  }, [typingUsers, wingProfiles]);

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setContextMsg(msg);
    setContextPos({ x: clientX, y: clientY });
  };

  // Long press for touch
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = (msg: Message) => (e: React.TouchEvent) => {
    longPressRef.current = setTimeout(() => {
      handleContextMenu(e, msg);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  // Insert emoji into input
  const insertEmoji = (emoji: string) => {
    if (editingMsg) {
      setEditInput((prev) => prev + emoji);
    } else {
      setChatInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // ─── Filtered conversation list ────────────────────
  const activeConversations = conversations.filter((c) => !archivedIds.includes(c.partnerId));
  const archivedConversations = conversations.filter((c) => archivedIds.includes(c.partnerId));

  // Build unified list sorted by last message time
  const unifiedList = useMemo(() => {
    const items: { type: "dm" | "group"; id: string; name: string; avatar?: string | null; lastMsg?: string; lastTime?: string; unread: number; status?: string; memberCount?: number; isCreator?: boolean }[] = [];

    // DMs
    wingProfiles.filter((w) => !archivedIds.includes(w.userId)).forEach((wing) => {
      const convo = activeConversations.find((c) => c.partnerId === wing.userId);
      items.push({
        type: "dm",
        id: wing.userId,
        name: wing.firstName || wing.username || "?",
        avatar: wing.profilePhoto,
        lastMsg: convo?.lastMessage?.content || undefined,
        lastTime: convo?.lastMessage?.createdAt || undefined,
        unread: unreadCounts[wing.userId] || 0,
        status: wingStatuses[wing.userId] || "offline",
      });
    });

    // Groups
    groups.forEach((group) => {
      items.push({
        type: "group",
        id: group.id,
        name: group.name || group.memberIds.filter((id: string) => id !== userId).map((id: string) => getProfileFor(id)?.firstName || "?").join(", "),
        avatar: group.groupPhoto,
        lastMsg: undefined,
        lastTime: group.createdAt,
        unread: 0,
        memberCount: group.memberIds.length,
        isCreator: group.createdBy === userId,
      });
    });

    // Sort: unread first, then by last message time
    items.sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (b.unread > 0 && a.unread === 0) return 1;
      const tA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const tB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return tB - tA;
    });

    return items;
  }, [wingProfiles, groups, activeConversations, archivedIds, unreadCounts, wingStatuses, userId]);

  // Apply filters
  const filteredList = useMemo(() => {
    let list = unifiedList;
    if (activeTab === "groups") list = list.filter((i) => i.type === "group");
    if (activeTab === "dms") list = list.filter((i) => i.type === "dm");
    if (activeTab === "archived") {
      return archivedConversations.map((c) => {
        const wing = wingProfiles.find((w) => w.userId === c.partnerId);
        return {
          type: "dm" as const, id: c.partnerId,
          name: wing?.firstName || wing?.username || "?",
          avatar: wing?.profilePhoto,
          lastMsg: c.lastMessage?.content,
          lastTime: c.lastMessage?.createdAt,
          unread: 0, status: "offline",
        };
      });
    }
    if (searchFilter) {
      list = list.filter((i) => i.name.toLowerCase().includes(searchFilter.toLowerCase()));
    }
    return list;
  }, [unifiedList, activeTab, searchFilter, archivedConversations, wingProfiles]);

  if (!loaded) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-xs text-[var(--outline)]">Chargement des messages...</p>
      </div>
    </div>
  );

  if (!isProfileComplete) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent">Messages</span>
          </h1>
        </div>
        <ProfileIncompleteNotice />
      </div>
    );
  }

  // ─── Conversation Sidebar ─────────────────────────
  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent">Messages</span>
            </h1>
            {totalUnread > 0 && (
              <p className="text-[11px] text-[var(--primary)] font-medium mt-0.5">{totalUnread} non lu{totalUnread > 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white flex items-center justify-center hover:shadow-[0_0_16px_-4px_var(--neon-purple)] transition-all"
            title="Nouveau groupe"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-low)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] outline-none focus:border-[var(--border-focus)] transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--surface-low)]">
          {([
            { key: "all", label: "Tout" },
            { key: "dms", label: "DMs" },
            { key: "groups", label: "Groupes" },
            { key: "archived", label: "Archives" },
          ] as { key: ConvoTab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"
              }`}
            >
              {tab.label}
              {tab.key === "archived" && archivedConversations.length > 0 && (
                <span className="ml-1 text-[9px] opacity-70">({archivedConversations.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-bright)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            </div>
            <p className="text-sm text-[var(--outline)]">
              {activeTab === "archived" ? "Aucune conversation archivee" : searchFilter ? "Aucun resultat" : "Aucune conversation"}
            </p>
            {activeTab === "all" && !searchFilter && (
              <p className="text-[11px] text-[var(--outline)] mt-1">Ajoute des wings pour commencer</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredList.map((item) => {
              const isActive = chatTarget && (
                (chatTarget.type === "dm" && item.type === "dm" && chatTarget.userId === item.id) ||
                (chatTarget.type === "group" && item.type === "group" && chatTarget.groupId === item.id)
              );
              return (
                <div key={`${item.type}-${item.id}`} className="relative group/conv">
                  <button
                    onClick={() => item.type === "dm" ? handleOpenDm(item.id) : handleOpenGroup(item.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20"
                        : "hover:bg-[var(--surface-bright)] border border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {item.type === "dm" ? (
                        <>
                          <Avatar src={item.avatar} name={item.name} size="md" />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg)] ${WING_STATUS_COLORS[(item.status as WingStatus) || "offline"]}`} />
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
                          {item.avatar ? (
                            <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${item.unread > 0 ? "font-bold text-[var(--on-surface)]" : "font-medium text-[var(--on-surface-variant)]"}`}>
                          {item.name}
                        </p>
                        {item.lastTime && (
                          <span className={`text-[10px] shrink-0 ${item.unread > 0 ? "text-[var(--primary)] font-medium" : "text-[var(--outline)]"}`}>
                            {formatRelative(item.lastTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${item.unread > 0 ? "text-[var(--on-surface)] font-medium" : "text-[var(--outline)]"}`}>
                          {item.type === "group"
                            ? `${item.memberCount} membres`
                            : item.lastMsg || (item.status === "available" ? "En ligne" : "Aucun message")}
                        </p>
                        {item.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                            {item.unread > 9 ? "9+" : item.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Quick actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/conv:opacity-100 transition-opacity">
                    {activeTab === "archived" ? (
                      <button onClick={(e) => { e.stopPropagation(); unarchiveChat(item.id); toast.show("Desarchivee"); }}
                        className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Desarchiver">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" /></svg>
                      </button>
                    ) : item.type === "dm" ? (
                      <button onClick={(e) => { e.stopPropagation(); archiveChat(item.id); toast.show("Archivee"); }}
                        className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Archiver">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                      </button>
                    ) : (
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (item.isCreator) {
                          if (!confirm(`Supprimer "${item.name}" ?`)) return;
                          const ok = await deleteGroupAction(item.id);
                          if (ok) { toast.show("Groupe supprime"); refresh(); }
                        } else {
                          if (!confirm(`Quitter "${item.name}" ?`)) return;
                          await leaveGroupAction(item.id);
                          toast.show("Groupe quitte");
                          refresh();
                        }
                      }}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-red-400" title={item.isCreator ? "Supprimer" : "Quitter"}>
                        {item.isCreator ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Chat Messages Rendering ──────────────────────
  const renderMessages = () => {
    const sorted = [...currentMessages].reverse();
    const elements: React.ReactNode[] = [];

    sorted.forEach((msg, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
      const isMe = msg.fromUserId === userId;
      const senderProfile = !isMe ? getProfileFor(msg.fromUserId) : null;
      const isDeleted = !!msg.deletedAt;
      const isSystem = (msg as any).attachmentType === "system";

      // Date separator
      if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
        elements.push(
          <div key={`date-${msg.id}`} className="flex items-center gap-3 py-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] font-medium text-[var(--outline)] bg-[var(--surface-low)] px-3 py-1 rounded-full">
              {formatDateLabel(msg.createdAt)}
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
        );
      }

      // System message
      if (isSystem) {
        const sysProfile = getProfileFor(msg.fromUserId);
        elements.push(
          <div key={msg.id} className="flex justify-center py-1.5">
            <span className="text-[10px] text-[var(--outline)] bg-[var(--surface-low)] px-4 py-1.5 rounded-full border border-[var(--border)]">
              {sysProfile?.firstName || "?"} {msg.content}
            </span>
          </div>
        );
        return;
      }

      // Message grouping
      const isGroupedWithPrev = prev && !prev.deletedAt && (prev as any).attachmentType !== "system" && isSameMinuteAndUser(prev, msg);
      const isGroupedWithNext = next && !next.deletedAt && (next as any).attachmentType !== "system" && isSameMinuteAndUser(msg, next);
      const showAvatar = !isMe && chatTarget!.type === "group" && !isGroupedWithNext;
      const showName = !isMe && chatTarget!.type === "group" && !isGroupedWithPrev;
      const showTime = !isGroupedWithNext;

      // Bubble border radius
      const getBubbleRadius = () => {
        if (isMe) {
          if (isGroupedWithPrev && isGroupedWithNext) return "rounded-2xl rounded-r-md";
          if (isGroupedWithPrev) return "rounded-2xl rounded-tr-md";
          if (isGroupedWithNext) return "rounded-2xl rounded-br-md";
          return "rounded-2xl";
        } else {
          if (isGroupedWithPrev && isGroupedWithNext) return "rounded-2xl rounded-l-md";
          if (isGroupedWithPrev) return "rounded-2xl rounded-tl-md";
          if (isGroupedWithNext) return "rounded-2xl rounded-bl-md";
          return "rounded-2xl";
        }
      };

      elements.push(
        <div
          key={msg.id}
          className={`flex ${isMe ? "justify-end" : "justify-start"} ${isGroupedWithPrev ? "mt-0.5" : "mt-2"} group/msg`}
          onContextMenu={(e) => handleContextMenu(e, msg)}
          onTouchStart={handleTouchStart(msg)}
          onTouchEnd={handleTouchEnd}
        >
          {/* Avatar space for groups */}
          {!isMe && chatTarget!.type === "group" && (
            <div className="w-8 mr-2 shrink-0 flex items-end">
              {showAvatar && <Avatar src={senderProfile?.profilePhoto} name={senderProfile?.firstName} size="xs" />}
            </div>
          )}

          <div className="max-w-[75%] relative">
            {/* Sender name in groups */}
            {showName && !isDeleted && (
              <p className="text-[10px] font-semibold text-[var(--primary)] mb-0.5 ml-3">{senderProfile?.firstName || "?"}</p>
            )}

            {/* Reply preview */}
            {msg.replyPreview && (
              <div className={`mx-1 px-3 py-1.5 mb-0.5 rounded-xl text-[11px] border-l-2 ${
                isMe ? "bg-[var(--primary)]/5 border-[var(--primary)]/40 text-[var(--primary)]" : "bg-[var(--surface-low)] border-[var(--outline)]/30 text-[var(--outline)]"
              }`}>
                <p className="truncate">{msg.replyPreview}</p>
              </div>
            )}

            <div className={`px-3.5 py-2 text-sm relative ${getBubbleRadius()} ${
              isDeleted
                ? "bg-[var(--surface-low)] text-[var(--outline)] italic"
                : isMe
                  ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)] text-white shadow-sm shadow-[var(--primary)]/10"
                  : "bg-[var(--surface-bright)] text-[var(--on-surface)] border border-[var(--border)]"
            } ${msg.pinnedAt ? "ring-1 ring-amber-400/30 ring-offset-1 ring-offset-[var(--bg)]" : ""}`}>

              {isDeleted ? (
                <p className="text-xs flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Message supprime
                </p>
              ) : (
                <>
                  {/* Attachment */}
                  {msg.attachmentUrl && msg.attachmentType === "image" && (
                    <img
                      src={msg.attachmentUrl} alt=""
                      className="rounded-lg max-w-full max-h-[280px] object-cover mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxUrl(msg.attachmentUrl)}
                    />
                  )}
                  {msg.attachmentUrl && msg.attachmentType === "voice" && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                      </div>
                      <audio controls src={msg.attachmentUrl} className="max-w-[200px] h-8" />
                    </div>
                  )}
                  {msg.attachmentUrl && msg.attachmentType === "gif" && (
                    <img src={msg.attachmentUrl} alt="GIF" className="rounded-lg max-w-full max-h-[200px] mb-1" />
                  )}

                  {/* Content */}
                  {msg.content && <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

                  {msg.editedAt && (
                    <span className={`text-[8px] ${isMe ? "text-white/40" : "text-[var(--outline)]"}`}> (modifie)</span>
                  )}
                </>
              )}

              {/* Time + read receipt */}
              {showTime && (
                <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <p className={`text-[9px] ${isMe ? "text-white/50" : "text-[var(--outline)]"}`}>{formatTime(msg.createdAt)}</p>
                  {isMe && chatTarget!.type === "dm" && (
                    <span className={`text-[10px] ${msg.readAt ? "text-cyan-300" : "text-white/30"}`}>
                      {msg.readAt ? "✓✓" : "✓"}
                    </span>
                  )}
                  {msg.pinnedAt && (
                    <svg className={`w-2.5 h-2.5 ${isMe ? "text-amber-200/60" : "text-amber-400/60"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                  )}
                </div>
              )}
            </div>

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                {Object.entries(
                  msg.reactions.reduce<Record<string, string[]>>((acc, r) => {
                    acc[r.emoji] = acc[r.emoji] || [];
                    acc[r.emoji].push(r.userId);
                    return acc;
                  }, {})
                ).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(msg.id, emoji)}
                    className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${
                      users.includes(userId)
                        ? "bg-[var(--primary)]/15 border-[var(--primary)]/30 shadow-sm"
                        : "bg-[var(--surface-low)] border-[var(--border)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    {emoji} {users.length > 1 && <span className="text-[9px] opacity-70">{users.length}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Quick reaction on hover */}
            {!isDeleted && (
              <div className={`absolute top-0 ${isMe ? "-left-8" : "-right-8"} opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                <button
                  onClick={() => setShowReactionPicker(msg.id)}
                  className="p-1 rounded-full hover:bg-[var(--surface-bright)] text-[var(--outline)] text-xs"
                >
                  😊
                </button>
              </div>
            )}
          </div>
        </div>
      );
    });

    return elements;
  };

  // ─── Chat View ────────────────────────────────────
  const renderChatView = () => (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]/80 backdrop-blur-xl">
        <button onClick={() => { setChatTarget(null); setReplyTo(null); setEditingMsg(null); }} className="p-1.5 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] lg:hidden transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>

        {chatTarget!.type === "dm" ? (
          <Link href={`/wings/${chatTarget!.type === "dm" ? (chatTarget as any).userId : ""}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
            <div className="relative">
              <Avatar src={getProfileFor((chatTarget as any).userId)?.profilePhoto} name={getProfileFor((chatTarget as any).userId)?.firstName} size="md" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg)] ${WING_STATUS_COLORS[(wingStatuses[(chatTarget as any).userId] as WingStatus) || "offline"]}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
              <p className="text-[11px] text-[var(--outline)]">
                {typingText || WING_STATUS_LABELS[(wingStatuses[(chatTarget as any).userId] as WingStatus) || "offline"]}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setShowGroupSettings(true)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
              {currentGroup?.groupPhoto ? (
                <img src={currentGroup.groupPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
              <p className="text-[11px] text-[var(--outline)]">
                {typingText || `${currentGroup?.memberIds.length || 0} membres`}
              </p>
            </div>
          </div>
        )}

        {/* Header actions */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors" title="Rechercher">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </button>
          <button onClick={loadPinned} className="p-2 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors" title="Epingles">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </button>
        </div>
      </div>

      {/* Pinned messages banner */}
      {currentMessages.some((m) => m.pinnedAt) && (
        <button onClick={loadPinned} className="px-4 py-2 bg-amber-400/5 hover:bg-amber-400/10 text-amber-400 text-xs flex items-center gap-2 shrink-0 border-b border-amber-400/10 transition-colors">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
          {currentMessages.filter((m) => m.pinnedAt).length} message(s) epingle(s)
        </button>
      )}

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-2"
        onScroll={() => {
          const el = chatContainerRef.current;
          if (!el) return;
          shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-cyan-400/10 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            </div>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Debut de la conversation</p>
            <p className="text-xs text-[var(--outline)] mt-1">Envoie un message pour commencer !</p>
          </div>
        ) : (
          <>
            {renderMessages()}
            {/* Typing indicator */}
            {typingText && chatTarget!.type === "group" && (
              <div className="flex justify-start mt-2">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-[var(--surface-bright)] border border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--outline)] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--outline)] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--outline)] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] text-[var(--outline)] ml-1">{typingText}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-[var(--surface-low)] border-t border-[var(--border)] flex items-center gap-3 shrink-0">
          <div className="w-1 h-8 rounded-full bg-[var(--primary)]" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[var(--primary)] font-semibold">
              {replyTo.fromUserId === userId ? "Toi" : getProfileFor(replyTo.fromUserId)?.firstName || "?"}
            </p>
            <p className="text-xs text-[var(--outline)] truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Edit bar */}
      {editingMsg && (
        <div className="px-4 py-2 bg-amber-400/5 border-t border-amber-400/10 flex items-center gap-3 shrink-0">
          <div className="w-1 h-8 rounded-full bg-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-amber-400 font-semibold">Modification</p>
            <p className="text-xs text-[var(--outline)] truncate">{editingMsg.content}</p>
          </div>
          <button onClick={() => { setEditingMsg(null); setEditInput(""); }} className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-3 py-2.5 border-t border-[var(--border)] bg-[var(--bg)] safe-area-bottom">
        {isRecording ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-medium flex-1">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
            </span>
            <button onClick={cancelRecording} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400" title="Annuler">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button onClick={stopRecording} className="p-2 rounded-xl bg-red-500 text-white" title="Envoyer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            {/* Attachment button */}
            <div className="relative shrink-0">
              <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); setShowGifPicker(false); }} className="p-2 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[160px] z-50 animate-scale-in">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <button onClick={() => { fileInputRef.current?.click(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                    Photo
                  </button>
                  <button onClick={() => { setShowGifPicker(true); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
                    <span className="text-sm font-bold text-pink-400 w-4 text-center">GIF</span>
                    GIF
                  </button>
                  <button onClick={() => { startRecording(); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                    Vocal
                  </button>
                </div>
              )}
            </div>

            {/* Emoji button */}
            <div className="relative shrink-0">
              <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); setShowGifPicker(false); }} className="p-2 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors">
                <span className="text-lg">😊</span>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3 z-50 w-[280px] max-h-[300px] overflow-y-auto animate-scale-in">
                  {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                    <div key={cat} className="mb-2">
                      <p className="text-[10px] font-medium text-[var(--outline)] mb-1">{cat}</p>
                      <div className="flex flex-wrap gap-0.5">
                        {emojis.map((e) => (
                          <button key={e} onClick={() => insertEmoji(e)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-bright)] text-lg transition-colors">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={editingMsg ? editInput : chatInput}
              onChange={(e) => {
                if (editingMsg) {
                  setEditInput(e.target.value);
                } else {
                  setChatInput(e.target.value);
                  sendTypingIndicator();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  editingMsg ? handleEdit() : handleSend();
                }
              }}
              onFocus={() => { setShowAttachMenu(false); setShowEmojiPicker(false); setShowGifPicker(false); }}
              placeholder={editingMsg ? "Modifier le message..." : "Ecrire un message..."}
              rows={1}
              className="flex-1 resize-none rounded-xl bg-[var(--surface-low)] px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] border border-[var(--border)] outline-none focus:border-[var(--border-focus)] transition-all max-h-[120px]"
            />

            {/* Send button */}
            <button
              onClick={editingMsg ? handleEdit : handleSend}
              disabled={editingMsg ? !editInput.trim() : !chatInput.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shrink-0 disabled:opacity-30 hover:shadow-[0_0_16px_-4px_var(--neon-purple)] transition-all"
            >
              {editingMsg ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="absolute bottom-20 left-4 right-4 max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3 z-50 max-h-[300px] overflow-hidden flex flex-col animate-scale-in">
          <div className="relative mb-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input
              value={gifQuery}
              onChange={(e) => { setGifQuery(e.target.value); searchGifs(e.target.value); }}
              placeholder="Rechercher un GIF..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-low)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5">
            {gifResults.map((gif: any) => (
              <button key={gif.id} onClick={() => sendGif(gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url)} className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                <img src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url} alt="" className="w-full h-24 object-cover" />
              </button>
            ))}
          </div>
          <button onClick={() => setShowGifPicker(false)} className="mt-2 text-xs text-[var(--outline)] hover:text-[var(--on-surface)] text-center">Fermer</button>
        </div>
      )}
    </div>
  );

  // ─── Context Menu ─────────────────────────────────
  const renderContextMenu = () => {
    if (!contextMsg || !contextPos) return null;
    return createPortal(
      <div
        className="fixed z-[10000] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] py-1 min-w-[180px] animate-scale-in"
        style={{ left: Math.min(contextPos.x, window.innerWidth - 200), top: Math.min(contextPos.y, window.innerHeight - 350) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quick reactions row */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border)]">
          {REACTION_EMOJIS.slice(0, 6).map((emoji) => (
            <button key={emoji} onClick={() => { toggleReaction(contextMsg.id, emoji); setContextMsg(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-bright)] text-base transition-transform hover:scale-110">
              {emoji}
            </button>
          ))}
        </div>
        <button onClick={() => { setReplyTo(contextMsg); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
          Repondre
        </button>
        <button onClick={() => { setShowReactionPicker(contextMsg.id); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
          <span className="w-4 text-center">😊</span>
          Reagir
        </button>
        {contextMsg.fromUserId === userId && !contextMsg.deletedAt && (
          <>
            <button onClick={() => { setEditingMsg(contextMsg); setEditInput(contextMsg.content); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
              Modifier
            </button>
            <button onClick={async () => { await deleteMsg(contextMsg.id); toast.show("Supprime"); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Supprimer
            </button>
          </>
        )}
        <div className="border-t border-[var(--border)] mt-0.5" />
        <button onClick={async () => {
          if (contextMsg.pinnedAt) { await unpinMsg(contextMsg.id); toast.show("Desepingle"); }
          else { await pinMsg(contextMsg.id); toast.show("Epingle"); }
          setContextMsg(null);
        }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          {contextMsg.pinnedAt ? "Desepingler" : "Epingler"}
        </button>
        <button onClick={() => { setForwardingMsg(contextMsg); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
          Transferer
        </button>
        <button onClick={() => { navigator.clipboard.writeText(contextMsg.content); toast.show("Copie !"); setContextMsg(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
          Copier
        </button>
      </div>,
      document.body,
    );
  };

  // ─── Main Layout ──────────────────────────────────

  // Mobile: show list or chat
  // Desktop: split pane
  if (chatTarget) {
    const chatContent = (
      <>
        <div className="fixed inset-0 lg:left-[230px] z-[9999] flex bg-[var(--bg)]">
          {/* Desktop sidebar */}
          <div className="hidden lg:flex w-[340px] shrink-0 border-r border-[var(--border)] flex-col bg-[var(--bg)]">
            {renderConversationList()}
          </div>
          {/* Chat */}
          <div className="flex-1 flex flex-col relative">
            {renderChatView()}
          </div>
        </div>

        {renderContextMenu()}

        {/* Reaction picker overlay */}
        {showReactionPicker && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowReactionPicker(null)}>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex gap-1.5 shadow-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => { toggleReaction(showReactionPicker, emoji); setShowReactionPicker(null); }} className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-xl hover:bg-[var(--surface-bright)]">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Lightbox */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20" onClick={() => setLightboxUrl(null)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Search Modal */}
        <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }} title="Rechercher">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Mot-cle..." onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
              <Button onClick={handleSearch} size="sm">Chercher</Button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1.5">
              {searchResults.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar src={getProfileFor(msg.fromUserId)?.profilePhoto} name={getProfileFor(msg.fromUserId)?.firstName} size="xs" />
                    <span className="text-[11px] font-medium text-[var(--on-surface-variant)]">{getProfileFor(msg.fromUserId)?.firstName || "?"}</span>
                    <span className="text-[10px] text-[var(--outline)]">{formatRelative(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[var(--on-surface)]">{msg.content}</p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && <p className="text-xs text-[var(--outline)] text-center py-6">Aucun resultat</p>}
            </div>
          </div>
        </Modal>

        {/* Pinned Messages Modal */}
        <Modal open={showPinned} onClose={() => setShowPinned(false)} title="Messages epingles">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-[var(--outline)] text-center py-6">Aucun message epingle</p>
            ) : pinnedMessages.map((msg) => (
              <div key={msg.id} className="p-3 rounded-xl bg-[var(--surface-low)] border border-amber-400/10">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar src={getProfileFor(msg.fromUserId)?.profilePhoto} name={getProfileFor(msg.fromUserId)?.firstName} size="xs" />
                  <span className="text-[11px] text-amber-400 font-medium">{getProfileFor(msg.fromUserId)?.firstName || "?"}</span>
                  <span className="text-[10px] text-[var(--outline)]">{formatRelative(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--on-surface)]">{msg.content}</p>
                <button onClick={async () => { await unpinMsg(msg.id); setPinnedMessages((prev) => prev.filter((m) => m.id !== msg.id)); toast.show("Desepingle"); }} className="text-[10px] text-[var(--outline)] hover:text-red-400 mt-2">Desepingler</button>
              </div>
            ))}
          </div>
        </Modal>

        {/* Forward Modal */}
        <Modal open={!!forwardingMsg} onClose={() => setForwardingMsg(null)} title="Transferer">
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {wingProfiles.map((wing) => (
              <button key={wing.userId} onClick={async () => {
                await forwardMsg(forwardingMsg!.id, wing.userId, null);
                toast.show("Transfere");
                setForwardingMsg(null);
              }} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-bright)] transition-colors">
                <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" />
                <span className="text-sm text-[var(--on-surface)]">{wing.firstName || wing.username}</span>
              </button>
            ))}
            {groups.map((group) => (
              <button key={group.id} onClick={async () => {
                await forwardMsg(forwardingMsg!.id, null, group.id);
                toast.show("Transfere");
                setForwardingMsg(null);
              }} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-bright)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                </div>
                <span className="text-sm text-[var(--on-surface)]">{group.name}</span>
              </button>
            ))}
          </div>
        </Modal>

        {/* Group Settings Modal */}
        <Modal open={showGroupSettings} onClose={() => setShowGroupSettings(false)} title="Parametres du groupe">
          {currentGroup && (
            <div className="space-y-4">
              {/* Group photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden border border-[var(--border)]">
                  {currentGroup.groupPhoto ? (
                    <img src={currentGroup.groupPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  )}
                </div>
                <p className="text-lg font-semibold text-[var(--on-surface)]">{currentGroup.name || "Groupe"}</p>
                <p className="text-xs text-[var(--outline)]">{currentGroup.memberIds.length} membres</p>
                {isGroupCreator && (
                  <>
                    <input ref={groupPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupPhotoUpload} />
                    <Button size="sm" variant="secondary" onClick={() => groupPhotoInputRef.current?.click()}>Changer la photo</Button>
                  </>
                )}
              </div>

              {/* Rename */}
              {isGroupCreator && (
                <div className="flex gap-2">
                  <Input value={renameInput || currentGroup.name} onChange={(e) => setRenameInput(e.target.value)} placeholder="Nom du groupe..." className="flex-1" />
                  <Button size="sm" onClick={async () => {
                    if (!renameInput.trim()) return;
                    await renameMessageGroupAction(currentGroup.id, renameInput.trim());
                    refresh();
                    toast.show("Renomme");
                  }}>OK</Button>
                </div>
              )}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[var(--on-surface-variant)]">Membres ({currentGroup.memberIds.length})</p>
                  {isGroupCreator && (
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddMembers(true); setAddMemberIds([]); }}>+ Ajouter</Button>
                  )}
                </div>
                <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                  {currentGroup.memberIds.map((mid: string) => {
                    const p = getProfileFor(mid);
                    const isSelf = mid === userId;
                    const isCreator = mid === currentGroup.createdBy;
                    return (
                      <div key={mid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface-low)]">
                        <Avatar src={p?.profilePhoto} name={p?.firstName || mid} size="sm" className="!w-8 !h-8" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--on-surface)] truncate">
                            {p?.firstName || mid}
                            {isSelf && <span className="text-[10px] text-[var(--primary)] ml-1">(toi)</span>}
                            {isCreator && <span className="text-[10px] text-amber-400 ml-1">Admin</span>}
                          </p>
                        </div>
                        {isGroupCreator && !isSelf && (
                          <button onClick={async () => {
                            await removeGroupMemberAction(currentGroup.id, mid);
                            refresh();
                            toast.show("Retire");
                          }} className="text-[10px] text-red-400 hover:underline px-2 py-1 rounded-lg hover:bg-red-500/10">Retirer</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave / Delete */}
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <Button variant="danger" className="w-full" onClick={async () => {
                  await leaveGroupAction(currentGroup.id);
                  toast.show("Groupe quitte");
                  setChatTarget(null);
                  setShowGroupSettings(false);
                  refresh();
                }}>Quitter le groupe</Button>

                {isGroupCreator && (
                  <Button variant="danger" className="w-full !bg-red-500/20 !border-red-500/30" onClick={async () => {
                    if (!confirm("Supprimer ce groupe et tous ses messages ?")) return;
                    const ok = await deleteGroupAction(currentGroup.id);
                    if (ok) {
                      toast.show("Groupe supprime");
                      setChatTarget(null);
                      setShowGroupSettings(false);
                      refresh();
                    }
                  }}>Supprimer le groupe</Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Add Members Modal */}
        <Modal open={showAddMembers} onClose={() => setShowAddMembers(false)} title="Ajouter des membres">
          <div className="space-y-3">
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {wingProfiles.filter((w) => !currentGroup?.memberIds.includes(w.userId)).map((wing) => (
                <button key={wing.userId}
                  onClick={() => setAddMemberIds((prev) => prev.includes(wing.userId) ? prev.filter((id) => id !== wing.userId) : [...prev, wing.userId])}
                  className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all ${addMemberIds.includes(wing.userId) ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20" : "hover:bg-[var(--surface-bright)] border border-transparent"}`}>
                  <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" />
                  <span className="text-sm text-[var(--on-surface)] flex-1">{wing.firstName || wing.username}</span>
                  {addMemberIds.includes(wing.userId) && (
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-low)]">
              <div>
                <p className="text-xs font-medium text-[var(--on-surface)]">Partager l&apos;historique</p>
                <p className="text-[10px] text-[var(--outline)]">Voir les anciens messages</p>
              </div>
              <button onClick={() => setShowHistoryToNew(!showHistoryToNew)} className={`relative w-11 h-6 rounded-full transition-colors ${showHistoryToNew ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${showHistoryToNew ? "translate-x-5" : ""}`} />
              </button>
            </div>
            <Button disabled={addMemberIds.length === 0} onClick={async () => {
              if (!currentGroup) return;
              const ok = await addGroupMembersWithHistoryAction(currentGroup.id, addMemberIds, showHistoryToNew);
              if (ok) {
                toast.show("Ajoutes");
                setShowAddMembers(false);
                refresh();
              }
            }}>Ajouter {addMemberIds.length > 0 && `(${addMemberIds.length})`}</Button>
          </div>
        </Modal>
      </>
    );
    if (typeof document === "undefined") return null;
    return createPortal(chatContent, document.body);
  }

  // ─── No chat selected: show conversation list ────
  return (
    <>
      <div className="h-[calc(100vh-64px)] lg:h-screen flex">
        {/* Mobile/Tablet: full width list */}
        <div className="w-full lg:hidden">
          {renderConversationList()}
        </div>

        {/* Desktop: split pane */}
        <div className="hidden lg:flex w-full">
          <div className="w-[340px] shrink-0 border-r border-[var(--border)]">
            {renderConversationList()}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--primary)]/10 to-cyan-400/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              </div>
              <p className="text-lg font-semibold text-[var(--on-surface-variant)]">Tes messages</p>
              <p className="text-sm text-[var(--outline)] mt-1">Selectionne une conversation pour commencer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal open={showCreateGroup} onClose={() => { setShowCreateGroup(false); setGroupName(""); setSelectedMembers([]); }} title="Nouveau groupe">
        <div className="space-y-4">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe..." />
          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Selectionne les membres</p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {wingProfiles.map((wing) => (
                <button key={wing.userId}
                  onClick={() => setSelectedMembers((prev) => prev.includes(wing.userId) ? prev.filter((id) => id !== wing.userId) : [...prev, wing.userId])}
                  className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all ${selectedMembers.includes(wing.userId) ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20" : "hover:bg-[var(--surface-bright)] border border-transparent"}`}>
                  <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" />
                  <span className="text-sm text-[var(--on-surface)] flex-1">{wing.firstName || wing.username}</span>
                  {selectedMembers.includes(wing.userId) && (
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map((id) => {
                const p = getProfileFor(id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs">
                    {p?.firstName || "?"}
                    <button onClick={() => setSelectedMembers((prev) => prev.filter((sid) => sid !== id))} className="hover:text-red-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup} className="w-full">
            Creer le groupe ({selectedMembers.length} membre{selectedMembers.length > 1 ? "s" : ""})
          </Button>
        </div>
      </Modal>
    </>
  );
}
