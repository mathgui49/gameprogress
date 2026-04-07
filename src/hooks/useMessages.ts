"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { supabaseClient } from "@/lib/supabase-client";
import type { Message, MessageGroup } from "@/types";
import {
  fetchMessagesAction, fetchGroupMessagesAction, sendMessageAction,
  markMessagesReadAction, fetchUnreadCountsAction, fetchConversationListAction,
  createMessageGroupAction, fetchUserGroupsAction, fetchArchivedConversationsAction,
  addReactionAction, editMessageAction, deleteMessageAction,
  pinMessageAction, unpinMessageAction, searchMessagesAction,
  forwardMessageAction, archiveConversationAction, unarchiveConversationAction,
  uploadChatAttachmentAction,
} from "@/actions/db";

// camelCase converter (same as fromRow in db.ts)
function fromRow(row: any): any {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

export function useMessages() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [conversations, setConversations] = useState<{ partnerId: string; lastMessage: Message }[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const activeChatRef = useRef<{ type: "dm" | "group"; id: string } | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const [convos, grps, unreads, archived] = await Promise.all([
      fetchConversationListAction(),
      fetchUserGroupsAction(),
      fetchUnreadCountsAction(),
      fetchArchivedConversationsAction(),
    ]);
    setConversations(convos);
    setGroups(grps);
    setUnreadCounts(unreads);
    setArchivedIds(archived);
    setLoaded(true);
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── Supabase Realtime for messages ────────────────
  const subscribeToChat = useCallback((type: "dm" | "group", id: string) => {
    // Unsubscribe from previous
    if (realtimeChannelRef.current) {
      supabaseClient.removeChannel(realtimeChannelRef.current);
    }
    if (typingChannelRef.current) {
      supabaseClient.removeChannel(typingChannelRef.current);
    }

    const channelName = type === "group" ? `group-${id}` : `dm-${[userId, id].sort().join("-")}`;

    // Subscribe to new messages
    const filter = type === "group"
      ? `group_id=eq.${id}`
      : `or(and(from_user_id.eq.${userId},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${userId}))`;

    const channel = supabaseClient
      .channel(`messages:${channelName}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: type === "group" ? `group_id=eq.${id}` : undefined,
      }, (payload: any) => {
        const msg = fromRow(payload.new) as Message;
        // Only add if relevant to this chat
        if (type === "group" && msg.groupId !== id) return;
        if (type === "dm" && !((msg.fromUserId === userId && msg.toUserId === id) || (msg.fromUserId === id && msg.toUserId === userId))) return;
        setCurrentMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [msg, ...prev];
        });
        // Clear typing when message received
        if (msg.fromUserId !== userId) {
          setTypingUsers((prev) => ({ ...prev, [msg.fromUserId]: false }));
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      }, (payload: any) => {
        const updated = fromRow(payload.new) as Message;
        setCurrentMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    // Typing indicator channel (presence-based)
    const typingChannel = supabaseClient
      .channel(`typing:${channelName}`)
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const typerId = payload.payload?.userId;
        if (typerId && typerId !== userId) {
          setTypingUsers((prev) => ({ ...prev, [typerId]: true }));
          // Auto-clear after 3s
          setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [typerId]: false }));
          }, 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (realtimeChannelRef.current) supabaseClient.removeChannel(realtimeChannelRef.current);
    if (typingChannelRef.current) supabaseClient.removeChannel(typingChannelRef.current);
  }, []);

  // ─── Typing indicator sender ───────────────────────
  const sendTypingIndicator = useCallback(() => {
    if (!typingChannelRef.current || !userId) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  const openConversation = useCallback(async (otherUserId: string) => {
    activeChatRef.current = { type: "dm", id: otherUserId };
    const messages = await fetchMessagesAction(otherUserId);
    setCurrentMessages(messages);
    await markMessagesReadAction(otherUserId);
    setUnreadCounts((prev) => ({ ...prev, [otherUserId]: 0 }));
    subscribeToChat("dm", otherUserId);
  }, [subscribeToChat]);

  const openGroupChat = useCallback(async (groupId: string) => {
    activeChatRef.current = { type: "group", id: groupId };
    const messages = await fetchGroupMessagesAction(groupId);
    setCurrentMessages(messages);
    subscribeToChat("group", groupId);
  }, [subscribeToChat]);

  const send = useCallback(async (
    toUserId: string | null,
    groupId: string | null,
    content: string,
    opts?: { replyToId?: string; replyPreview?: string; attachmentUrl?: string; attachmentType?: string },
  ) => {
    try {
      const id = await sendMessageAction(toUserId, groupId, content, opts);
      if (id) {
        const msg: Message = {
          id,
          fromUserId: userId,
          toUserId: toUserId ?? "",
          groupId,
          content,
          createdAt: new Date().toISOString(),
          readAt: null,
          replyToId: opts?.replyToId ?? null,
          replyPreview: opts?.replyPreview ?? null,
          attachmentUrl: opts?.attachmentUrl ?? null,
          attachmentType: (opts?.attachmentType as any) ?? null,
          editedAt: null,
          deletedAt: null,
          reactions: [],
          pinnedAt: null,
          pinnedBy: null,
        };
        setCurrentMessages((prev) => {
          if (prev.some((m) => m.id === id)) return prev;
          return [msg, ...prev];
        });
        loadConversations();
      }
      return id;
    } catch (err) {
      console.error("Failed to send message:", err);
      return null;
    }
  }, [userId, loadConversations]);

  const createGroup = useCallback(async (name: string, memberIds: string[]) => {
    const id = await createMessageGroupAction(name, memberIds);
    if (id) loadConversations();
    return id;
  }, [loadConversations]);

  // ─── Reactions ─────────────────────────────────────
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const ok = await addReactionAction(messageId, emoji);
    if (ok) {
      setCurrentMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);
        if (idx >= 0) reactions.splice(idx, 1);
        else reactions.push({ userId, emoji });
        return { ...m, reactions };
      }));
    }
  }, [userId]);

  // ─── Edit / Delete ─────────────────────────────────
  const editMsg = useCallback(async (messageId: string, newContent: string) => {
    const ok = await editMessageAction(messageId, newContent);
    if (ok) {
      setCurrentMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, content: newContent, editedAt: new Date().toISOString() } : m
      ));
    }
    return ok;
  }, []);

  const deleteMsg = useCallback(async (messageId: string) => {
    const ok = await deleteMessageAction(messageId);
    if (ok) {
      setCurrentMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, content: "", deletedAt: new Date().toISOString() } : m
      ));
    }
    return ok;
  }, []);

  // ─── Pin ───────────────────────────────────────────
  const pinMsg = useCallback(async (messageId: string) => {
    const ok = await pinMessageAction(messageId);
    if (ok) {
      setCurrentMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, pinnedAt: new Date().toISOString(), pinnedBy: userId } : m
      ));
    }
    return ok;
  }, [userId]);

  const unpinMsg = useCallback(async (messageId: string) => {
    const ok = await unpinMessageAction(messageId);
    if (ok) {
      setCurrentMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, pinnedAt: null, pinnedBy: null } : m
      ));
    }
    return ok;
  }, []);

  // ─── Search ────────────────────────────────────────
  const searchMsgs = useCallback(async (query: string) => {
    return searchMessagesAction(query);
  }, []);

  // ─── Forward ───────────────────────────────────────
  const forwardMsg = useCallback(async (messageId: string, toUserId: string | null, groupId: string | null) => {
    return forwardMessageAction(messageId, toUserId, groupId);
  }, []);

  // ─── Archive ───────────────────────────────────────
  const archiveChat = useCallback(async (partnerId: string) => {
    const ok = await archiveConversationAction(partnerId);
    if (ok) setArchivedIds((prev) => [...prev, partnerId]);
    return ok;
  }, []);

  const unarchiveChat = useCallback(async (partnerId: string) => {
    const ok = await unarchiveConversationAction(partnerId);
    if (ok) setArchivedIds((prev) => prev.filter((id) => id !== partnerId));
    return ok;
  }, []);

  // ─── Upload attachment ─────────────────────────────
  const uploadAttachment = useCallback(async (base64: string, type: "image" | "voice") => {
    return uploadChatAttachmentAction(base64, type);
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + c, 0);

  return {
    conversations, groups, unreadCounts, currentMessages, loaded, totalUnread,
    archivedIds, typingUsers,
    openConversation, openGroupChat, send, createGroup, refresh: loadConversations,
    sendTypingIndicator,
    toggleReaction, editMsg, deleteMsg, pinMsg, unpinMsg,
    searchMsgs, forwardMsg,
    archiveChat, unarchiveChat,
    uploadAttachment,
  };
}
