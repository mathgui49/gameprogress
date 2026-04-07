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
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicProfile, WingStatus, MessageGroup, Message } from "@/types";
import { WING_STATUS_LABELS, WING_STATUS_COLORS } from "@/types";
import { formatRelative } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";

type ChatTarget = { type: "dm"; userId: string } | { type: "group"; groupId: string };

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

// ─── GIF Search via Tenor ────────────────────────────
const TENOR_KEY = "AIzaSyDDAz10frjurU4YHrqFYc67hHsUFMmnXFQ"; // public Tenor API key

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

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Rename group modal
  const [showRenameGroup, setShowRenameGroup] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // Group settings modal
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Add members modal
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [showHistoryToNew, setShowHistoryToNew] = useState(true);

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Edit state
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");

  // Context menu (long press / right click)
  const [contextMsg, setContextMsg] = useState<Message | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);

  // Reaction picker
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  // Search
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

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show archived
  const [showArchived, setShowArchived] = useState(false);

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
      toast.show("Erreur lors de l'envoi du message", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingMsg || !editInput.trim()) return;
    const ok = await editMsg(editingMsg.id, editInput.trim());
    if (ok) {
      toast.show("Message modifié");
      setEditingMsg(null);
      setEditInput("");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const id = await createGroup(groupName, selectedMembers);
      if (id) {
        setShowCreateGroup(false);
        setGroupName("");
        setSelectedMembers([]);
        toast.show("Groupe créé !", "success");
      } else {
        toast.show("Erreur lors de la création du groupe", "error");
      }
    } catch {
      toast.show("Erreur lors de la création du groupe", "error");
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
        toast.show("Erreur lors de l'upload", "error");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
              await send(chatTarget.userId, null, "🎤 Message vocal", { attachmentUrl: url, attachmentType: "voice" });
            } else {
              await send(null, chatTarget.groupId, "🎤 Message vocal", { attachmentUrl: url, attachmentType: "voice" });
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

  // GIF search
  const searchGifs = async (q: string) => {
    if (!q.trim()) { setGifResults([]); return; }
    try {
      const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=20&media_filter=tinygif`);
      const data = await res.json();
      setGifResults(data.results || []);
    } catch {
      setGifResults([]);
    }
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

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchMsgs(searchQuery);
    setSearchResults(results);
  };

  // Load pinned messages
  const loadPinned = async () => {
    if (!chatTarget) return;
    const type = chatTarget.type === "dm" ? "dm" : "group";
    const id = chatTarget.type === "dm" ? chatTarget.userId : chatTarget.groupId;
    const msgs = await fetchPinnedMessagesAction(type, id);
    setPinnedMessages(msgs);
    setShowPinned(true);
  };

  // Group photo upload
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || chatTarget?.type !== "group") return;
    const reader = new FileReader();
    reader.onload = async () => {
      const ok = await updateGroupPhotoAction(chatTarget.groupId, reader.result as string);
      if (ok) { toast.show("Photo de groupe mise à jour"); refresh(); }
      else toast.show("Erreur", "error");
    };
    reader.readAsDataURL(file);
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
    if (typing.length === 1) return `${typing[0]} écrit...`;
    return `${typing.join(", ")} écrivent...`;
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

  // Link preview extraction
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  if (!isProfileComplete) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent animate-gradient-text">Messages</span>
          </h1>
        </div>
        <ProfileIncompleteNotice />
      </div>
    );
  }

  // ─── Chat View (portal) ────────────────────────────
  if (chatTarget) {
    const chatView = (
      <>
        <div className="fixed inset-0 lg:left-[230px] z-[9999] flex flex-col bg-[var(--bg)]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
            <button onClick={() => { setChatTarget(null); setReplyTo(null); }} className="p-1 text-[var(--outline)] hover:text-[var(--on-surface)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            {chatTarget.type === "dm" ? (
              <Link href={`/wings/${chatTarget.userId}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                <div className="relative">
                  <Avatar src={getProfileFor(chatTarget.userId)?.profilePhoto} name={getProfileFor(chatTarget.userId)?.firstName} size="sm" className="!w-9 !h-9" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg)] ${WING_STATUS_COLORS[(wingStatuses[chatTarget.userId] as WingStatus) || "offline"]}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
                  <p className="text-[10px] text-[var(--outline)]">{WING_STATUS_LABELS[(wingStatuses[chatTarget.userId] as WingStatus) || "offline"]}</p>
                </div>
              </Link>
            ) : (
              <>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
                  {currentGroup?.groupPhoto ? (
                    <img src={currentGroup.groupPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  )}
                </div>
                <div className="flex-1" onClick={() => setShowGroupSettings(true)} style={{ cursor: "pointer" }}>
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
                  <p className="text-[10px] text-[var(--outline)]">{currentGroup?.memberIds.length || 0} membres</p>
                </div>
              </>
            )}
            {/* Header actions */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Rechercher">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </button>
              <button onClick={loadPinned} className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Messages épinglés">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              </button>
            </div>
          </div>

          {/* Pinned messages bar */}
          {currentMessages.some((m) => m.pinnedAt) && (
            <button onClick={loadPinned} className="px-4 py-1.5 bg-amber-400/10 text-amber-400 text-xs flex items-center gap-2 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              {currentMessages.filter((m) => m.pinnedAt).length} message(s) épinglé(s)
            </button>
          )}

          {/* Messages area */}
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-1 px-4 py-3"
            onScroll={() => {
              const el = chatContainerRef.current;
              if (!el) return;
              shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}>
            {[...currentMessages].reverse().map((msg) => {
              const isMe = msg.fromUserId === userId;
              const senderProfile = !isMe ? getProfileFor(msg.fromUserId) : null;
              const isDeleted = !!msg.deletedAt;
              const isSystem = (msg as any).attachmentType === "system";

              // System message
              if (isSystem) {
                const sysProfile = getProfileFor(msg.fromUserId);
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="text-[10px] text-[var(--outline)] bg-[var(--surface-low)] px-3 py-1 rounded-full">
                      {sysProfile?.firstName || "?"} {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                  onTouchStart={handleTouchStart(msg)}
                  onTouchEnd={handleTouchEnd}
                >
                  {!isMe && chatTarget.type === "group" && (
                    <div className="mr-2 shrink-0 mt-1">
                      <Avatar src={senderProfile?.profilePhoto} name={senderProfile?.firstName} size="xs" />
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    {/* Reply preview */}
                    {msg.replyPreview && (
                      <div className={`px-3 py-1 mb-0.5 rounded-t-xl text-[10px] border-l-2 ${isMe ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]" : "bg-[var(--surface-low)] border-[var(--outline)] text-[var(--outline)]"}`}>
                        {msg.replyPreview}
                      </div>
                    )}

                    <div className={`px-3 py-2 rounded-2xl text-sm relative ${
                      isDeleted
                        ? "bg-[var(--surface-low)] text-[var(--outline)] italic"
                        : isMe
                          ? "bg-[var(--primary)] text-white rounded-br-md"
                          : "bg-[var(--surface-bright)] text-[var(--on-surface)] rounded-bl-md border border-[var(--border)]"
                    } ${msg.pinnedAt ? "ring-1 ring-amber-400/40" : ""}`}>
                      {!isMe && chatTarget.type === "group" && !isDeleted && (
                        <p className="text-[10px] font-medium mb-0.5 text-[var(--primary)]">{senderProfile?.firstName || "?"}</p>
                      )}

                      {isDeleted ? (
                        <p className="text-xs">Message supprimé</p>
                      ) : (
                        <>
                          {/* Attachment */}
                          {msg.attachmentUrl && msg.attachmentType === "image" && (
                            <img src={msg.attachmentUrl} alt="" className="rounded-lg max-w-full max-h-[300px] object-cover mb-1 cursor-pointer" onClick={() => window.open(msg.attachmentUrl!, "_blank")} />
                          )}
                          {msg.attachmentUrl && msg.attachmentType === "voice" && (
                            <audio controls src={msg.attachmentUrl} className="max-w-full mb-1" />
                          )}
                          {msg.attachmentUrl && msg.attachmentType === "gif" && (
                            <img src={msg.attachmentUrl} alt="GIF" className="rounded-lg max-w-full max-h-[200px] mb-1" />
                          )}

                          {/* Content */}
                          {msg.content && <p className="break-words whitespace-pre-wrap">{msg.content}</p>}

                          {/* Link previews */}
                          {msg.content && extractUrls(msg.content).slice(0, 1).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`block mt-1 text-[10px] underline ${isMe ? "text-white/80" : "text-[var(--primary)]"}`}>
                              {url.length > 50 ? url.slice(0, 50) + "..." : url}
                            </a>
                          ))}

                          {msg.editedAt && (
                            <span className={`text-[8px] ${isMe ? "text-white/40" : "text-[var(--outline)]"}`}> (modifié)</span>
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className={`text-[9px] ${isMe ? "text-white/60" : "text-[var(--outline)]"}`}>{formatRelative(msg.createdAt)}</p>
                        {/* Read receipt for DMs */}
                        {isMe && chatTarget.type === "dm" && (
                          <span className={`text-[9px] ${msg.readAt ? "text-blue-400" : isMe ? "text-white/40" : "text-[var(--outline)]"}`}>
                            {msg.readAt ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
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
                                ? "bg-[var(--primary)]/15 border-[var(--primary)]/30"
                                : "bg-[var(--surface-low)] border-[var(--border)]"
                            }`}
                          >
                            {emoji} {users.length > 1 && <span className="text-[9px]">{users.length}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingText && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-[var(--surface-bright)] border border-[var(--border)] rounded-bl-md">
                  <p className="text-xs text-[var(--outline)] animate-pulse">{typingText}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="px-4 py-2 bg-[var(--surface-low)] border-t border-[var(--border)] flex items-center gap-2 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--primary)] font-medium">
                  Réponse à {replyTo.fromUserId === userId ? "toi" : getProfileFor(replyTo.fromUserId)?.firstName || "?"}
                </p>
                <p className="text-xs text-[var(--outline)] truncate">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-[var(--outline)] hover:text-[var(--on-surface)]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)] safe-area-bottom">
            <div className="flex gap-2 max-w-3xl mx-auto items-end">
              {/* Attachment buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Image">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                </button>
                <button onClick={() => setShowGifPicker(!showGifPicker)} className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="GIF">
                  <span className="text-xs font-bold">GIF</span>
                </button>
                {!isRecording ? (
                  <button onClick={startRecording} className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Message vocal">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  </button>
                ) : (
                  <button onClick={stopRecording} className="p-2 rounded-lg bg-red-500/20 text-red-400 animate-pulse" title="Arrêter">
                    <span className="text-xs font-bold">{recordingTime}s</span>
                  </button>
                )}
              </div>

              <Input
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
                placeholder={editingMsg ? "Modifier le message..." : "Message..."}
                className="flex-1"
              />
              {editingMsg ? (
                <div className="flex gap-1">
                  <Button onClick={handleEdit} size="sm">✓</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingMsg(null); setEditInput(""); }}>✕</Button>
                </div>
              ) : (
                <Button onClick={handleSend}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </Button>
              )}
            </div>
          </div>

          {/* GIF Picker */}
          {showGifPicker && (
            <div className="absolute bottom-20 left-4 right-4 max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3 z-50 max-h-[300px] overflow-hidden flex flex-col">
              <Input
                value={gifQuery}
                onChange={(e) => { setGifQuery(e.target.value); searchGifs(e.target.value); }}
                placeholder="Rechercher un GIF..."
                className="mb-2"
              />
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
                {gifResults.map((gif: any) => (
                  <button key={gif.id} onClick={() => sendGif(gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url)} className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                    <img src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url} alt="" className="w-full h-24 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMsg && contextPos && (
          <div
            className="fixed z-[10000] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[180px]"
            style={{ left: Math.min(contextPos.x, window.innerWidth - 200), top: Math.min(contextPos.y, window.innerHeight - 300) }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setReplyTo(contextMsg); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
              Répondre
            </button>
            <button onClick={() => { setShowReactionPicker(contextMsg.id); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
              😊 Réagir
            </button>
            {contextMsg.fromUserId === userId && !contextMsg.deletedAt && (
              <>
                <button onClick={() => { setEditingMsg(contextMsg); setEditInput(contextMsg.content); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                  Modifier
                </button>
                <button onClick={async () => { await deleteMsg(contextMsg.id); toast.show("Message supprimé"); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Supprimer
                </button>
              </>
            )}
            <button onClick={async () => {
              if (contextMsg.pinnedAt) { await unpinMsg(contextMsg.id); toast.show("Message désépinglé"); }
              else { await pinMsg(contextMsg.id); toast.show("Message épinglé"); }
              setContextMsg(null);
            }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              {contextMsg.pinnedAt ? "Désépingler" : "Épingler"}
            </button>
            <button onClick={() => { setForwardingMsg(contextMsg); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
              Transférer
            </button>
            <button onClick={() => { navigator.clipboard.writeText(contextMsg.content); toast.show("Copié !"); setContextMsg(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-bright)] text-[var(--on-surface)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
              Copier
            </button>
          </div>
        )}

        {/* Reaction picker overlay */}
        {showReactionPicker && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/30" onClick={() => setShowReactionPicker(null)}>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => { toggleReaction(showReactionPicker, emoji); setShowReactionPicker(null); }} className="text-2xl hover:scale-125 transition-transform p-1">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Modal */}
        <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }} title="Rechercher dans les messages">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
              <Button onClick={handleSearch} size="sm">Rechercher</Button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {searchResults.map((msg) => (
                <div key={msg.id} className="p-2 rounded-lg bg-[var(--surface-low)] text-sm">
                  <p className="text-[10px] text-[var(--outline)] mb-1">{getProfileFor(msg.fromUserId)?.firstName || "?"} · {formatRelative(msg.createdAt)}</p>
                  <p className="text-[var(--on-surface)]">{msg.content}</p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && <p className="text-xs text-[var(--outline)] text-center py-4">Aucun résultat</p>}
            </div>
          </div>
        </Modal>

        {/* Pinned Messages Modal */}
        <Modal open={showPinned} onClose={() => setShowPinned(false)} title="Messages épinglés">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-[var(--outline)] text-center py-4">Aucun message épinglé</p>
            ) : pinnedMessages.map((msg) => (
              <div key={msg.id} className="p-3 rounded-lg bg-[var(--surface-low)] border border-amber-400/20">
                <p className="text-[10px] text-amber-400 mb-1">{getProfileFor(msg.fromUserId)?.firstName || "?"} · {formatRelative(msg.createdAt)}</p>
                <p className="text-sm text-[var(--on-surface)]">{msg.content}</p>
                <button onClick={async () => { await unpinMsg(msg.id); setPinnedMessages((prev) => prev.filter((m) => m.id !== msg.id)); toast.show("Désépinglé"); }} className="text-[10px] text-[var(--outline)] hover:text-red-400 mt-1">Désépingler</button>
              </div>
            ))}
          </div>
        </Modal>

        {/* Forward Modal */}
        <Modal open={!!forwardingMsg} onClose={() => setForwardingMsg(null)} title="Transférer le message">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <p className="text-xs text-[var(--outline)] mb-2">Choisir le destinataire</p>
            {wingProfiles.map((wing) => (
              <button key={wing.userId} onClick={async () => {
                await forwardMsg(forwardingMsg!.id, wing.userId, null);
                toast.show("Message transféré");
                setForwardingMsg(null);
              }} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-bright)]">
                <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" className="!w-7 !h-7" />
                <span className="text-sm text-[var(--on-surface)]">{wing.firstName || wing.username}</span>
              </button>
            ))}
            {groups.map((group) => (
              <button key={group.id} onClick={async () => {
                await forwardMsg(forwardingMsg!.id, null, group.id);
                toast.show("Message transféré");
                setForwardingMsg(null);
              }} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-bright)]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                </div>
                <span className="text-sm text-[var(--on-surface)]">{group.name}</span>
              </button>
            ))}
          </div>
        </Modal>

        {/* Group Settings Modal */}
        <Modal open={showGroupSettings} onClose={() => setShowGroupSettings(false)} title="Paramètres du groupe">
          {currentGroup && (
            <div className="space-y-4">
              {/* Group photo */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
                  {currentGroup.groupPhoto ? (
                    <img src={currentGroup.groupPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  )}
                </div>
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
                    toast.show("Groupe renommé");
                  }}>Renommer</Button>
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
                <div className="space-y-1">
                  {currentGroup.memberIds.map((mid: string) => {
                    const p = getProfileFor(mid);
                    const isSelf = mid === userId;
                    const isCreator = mid === currentGroup.createdBy;
                    return (
                      <div key={mid} className="flex items-center gap-3 p-2 rounded-lg">
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
                            toast.show("Membre retiré");
                          }} className="text-[10px] text-red-400 hover:underline">Retirer</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave / Delete */}
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <Button variant="secondary" className="w-full !text-red-400" onClick={async () => {
                  await leaveGroupAction(currentGroup.id);
                  toast.show("Tu as quitté le groupe");
                  setChatTarget(null);
                  setShowGroupSettings(false);
                  refresh();
                }}>Quitter le groupe</Button>

                {isGroupCreator && (
                  <Button variant="secondary" className="w-full !text-red-400 !border-red-400/30" onClick={async () => {
                    if (!confirm("Supprimer ce groupe et tous ses messages ?")) return;
                    const ok = await deleteGroupAction(currentGroup.id);
                    if (ok) {
                      toast.show("Groupe supprimé");
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
                  className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-all ${addMemberIds.includes(wing.userId) ? "bg-[var(--primary)]/15 border border-[var(--primary)]/30" : "hover:bg-[var(--surface-bright)]"}`}>
                  <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" className="!w-7 !h-7" />
                  <span className="text-xs text-[var(--on-surface)]">{wing.firstName || wing.username}</span>
                  {addMemberIds.includes(wing.userId) && (
                    <svg className="w-4 h-4 text-[var(--primary)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  )}
                </button>
              ))}
            </div>

            {/* History toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-low)]">
              <div>
                <p className="text-xs font-medium text-[var(--on-surface)]">Voir l&apos;historique</p>
                <p className="text-[10px] text-[var(--outline)]">Les nouveaux membres voient les anciens messages</p>
              </div>
              <button onClick={() => setShowHistoryToNew(!showHistoryToNew)} className={`relative w-11 h-6 rounded-full transition-colors ${showHistoryToNew ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${showHistoryToNew ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <Button disabled={addMemberIds.length === 0} onClick={async () => {
              if (!currentGroup) return;
              const ok = await addGroupMembersWithHistoryAction(currentGroup.id, addMemberIds, showHistoryToNew);
              if (ok) {
                toast.show("Membres ajoutés");
                setShowAddMembers(false);
                refresh();
              }
            }}>Ajouter {addMemberIds.length > 0 && `(${addMemberIds.length})`}</Button>
          </div>
        </Modal>

        {/* Rename Group Modal (kept for backward compat) */}
        <Modal open={!!showRenameGroup} onClose={() => setShowRenameGroup(null)} title="Renommer le groupe">
          <div className="space-y-3">
            <Input value={renameInput} onChange={(e) => setRenameInput(e.target.value)} placeholder="Nouveau nom..." />
            <Button onClick={async () => {
              if (!renameInput.trim() || !showRenameGroup) return;
              await renameMessageGroupAction(showRenameGroup, renameInput.trim());
              refresh();
              setShowRenameGroup(null);
            }}>Renommer</Button>
          </div>
        </Modal>
      </>
    );
    if (typeof document === "undefined") return null;
    return createPortal(chatView, document.body);
  }

  // ─── Conversation List ─────────────────────────────
  const activeConversations = conversations.filter((c) => !archivedIds.includes(c.partnerId));
  const archivedConversations = conversations.filter((c) => archivedIds.includes(c.partnerId));

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent animate-gradient-text">Messages</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}` : "Tes conversations"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateGroup(true)}>+ Groupe</Button>
      </div>

      {/* Group chats */}
      {groups.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Groupes</p>
          <div className="space-y-2">
            {groups.map((group: MessageGroup) => {
              const memberNames = group.memberIds
                .filter((id: string) => id !== userId)
                .slice(0, 3)
                .map((id: string) => getProfileFor(id)?.firstName || "?")
                .join(", ");
              return (
                <button key={group.id} onClick={() => handleOpenGroup(group.id)} className="w-full text-left">
                  <Card hover className="!p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
                        {group.groupPhoto ? (
                          <img src={group.groupPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--on-surface)] truncate">{group.name || memberNames}</p>
                        <p className="text-[10px] text-[var(--outline)]">{group.memberIds.length} membres</p>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active DM conversations */}
      <div>
        <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Messages directs</p>
        {wingProfiles.length === 0 ? (
          <EmptyState
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>}
            title="Aucune conversation"
            description="Ajoute des wings pour commencer à discuter."
          />
        ) : (
          <div className="space-y-2">
            {wingProfiles.filter((w) => !archivedIds.includes(w.userId)).map((wing) => {
              const lastConvo = activeConversations.find((c) => c.partnerId === wing.userId);
              const unread = unreadCounts[wing.userId] || 0;
              const status = wingStatuses[wing.userId] as WingStatus || "offline";
              return (
                <div key={wing.userId} className="relative group/conv">
                  <button onClick={() => handleOpenDm(wing.userId)} className="w-full text-left">
                    <Card hover className="!p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="md" />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[status]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold ${unread > 0 ? "text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>{wing.firstName || wing.username}</p>
                            {lastConvo && <span className="text-[10px] text-[var(--outline)]">{formatRelative(lastConvo.lastMessage.createdAt)}</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            {lastConvo ? (
                              <p className={`text-xs truncate ${unread > 0 ? "text-[var(--on-surface)] font-medium" : "text-[var(--outline)]"}`}>{lastConvo.lastMessage.content}</p>
                            ) : (
                              <p className="text-xs text-[var(--outline)]">Aucun message</p>
                            )}
                            {unread > 0 && (
                              <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-medium shrink-0 ml-2">{unread}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </button>
                  {/* Archive swipe hint */}
                  <button onClick={() => { archiveChat(wing.userId); toast.show("Conversation archivée"); }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/conv:opacity-100 p-1.5 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-opacity" title="Archiver">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived conversations */}
      {archivedConversations.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowArchived(!showArchived)} className="text-xs font-medium text-[var(--outline)] flex items-center gap-1 mb-2 hover:text-[var(--on-surface-variant)]">
            <svg className={`w-3 h-3 transition-transform ${showArchived ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            Conversations archivées ({archivedConversations.length})
          </button>
          {showArchived && (
            <div className="space-y-2">
              {archivedConversations.map((convo) => {
                const wing = wingProfiles.find((w) => w.userId === convo.partnerId);
                if (!wing) return null;
                return (
                  <div key={convo.partnerId} className="flex items-center gap-2">
                    <button onClick={() => handleOpenDm(convo.partnerId)} className="flex-1 text-left">
                      <Card hover className="!p-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--on-surface-variant)]">{wing.firstName || wing.username}</p>
                            <p className="text-xs text-[var(--outline)] truncate">{convo.lastMessage.content}</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                    <button onClick={() => { unarchiveChat(convo.partnerId); toast.show("Conversation désarchivée"); }} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Désarchiver">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={showCreateGroup} onClose={() => { setShowCreateGroup(false); setGroupName(""); setSelectedMembers([]); }} title="Nouveau groupe">
        <div className="space-y-3">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe..." />
          <p className="text-xs text-[var(--on-surface-variant)]">Sélectionne les membres</p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {wingProfiles.map((wing) => (
              <button key={wing.userId}
                onClick={() => setSelectedMembers((prev) => prev.includes(wing.userId) ? prev.filter((id) => id !== wing.userId) : [...prev, wing.userId])}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-all ${selectedMembers.includes(wing.userId) ? "bg-[var(--primary)]/15 border border-[var(--primary)]/30" : "hover:bg-[var(--surface-bright)]"}`}>
                <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" className="!w-7 !h-7" />
                <span className="text-xs text-[var(--on-surface)]">{wing.firstName || wing.username}</span>
                {selectedMembers.includes(wing.userId) && (
                  <svg className="w-4 h-4 text-[var(--primary)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                )}
              </button>
            ))}
          </div>
          <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0}>Créer le groupe</Button>
        </div>
      </Modal>
    </div>
  );
}
