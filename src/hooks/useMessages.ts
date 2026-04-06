"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Message, MessageGroup } from "@/types";
import {
  fetchMessagesAction, fetchGroupMessagesAction, sendMessageAction,
  markMessagesReadAction, fetchUnreadCountsAction, fetchConversationListAction,
  createMessageGroupAction, fetchUserGroupsAction,
} from "@/actions/db";

export function useMessages() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [conversations, setConversations] = useState<{ partnerId: string; lastMessage: Message }[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const activeChatRef = useRef<{ type: "dm" | "group"; id: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const [convos, grps, unreads] = await Promise.all([
      fetchConversationListAction(),
      fetchUserGroupsAction(),
      fetchUnreadCountsAction(),
    ]);
    setConversations(convos);
    setGroups(grps);
    setUnreadCounts(unreads);
    setLoaded(true);
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Poll for new messages when a conversation is open
  const startPolling = useCallback((type: "dm" | "group", id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    activeChatRef.current = { type, id };
    pollRef.current = setInterval(async () => {
      const chat = activeChatRef.current;
      if (!chat) return;
      const msgs = chat.type === "dm"
        ? await fetchMessagesAction(chat.id)
        : await fetchGroupMessagesAction(chat.id);
      setCurrentMessages(msgs);
      if (chat.type === "dm") {
        await markMessagesReadAction(chat.id);
        setUnreadCounts((prev) => ({ ...prev, [chat.id]: 0 }));
      }
    }, 5000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    activeChatRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { stopPolling(); }, [stopPolling]);

  const openConversation = useCallback(async (otherUserId: string) => {
    const messages = await fetchMessagesAction(otherUserId);
    setCurrentMessages(messages);
    await markMessagesReadAction(otherUserId);
    setUnreadCounts((prev) => ({ ...prev, [otherUserId]: 0 }));
    startPolling("dm", otherUserId);
  }, [startPolling]);

  const openGroupChat = useCallback(async (groupId: string) => {
    const messages = await fetchGroupMessagesAction(groupId);
    setCurrentMessages(messages);
    startPolling("group", groupId);
  }, [startPolling]);

  const send = useCallback(async (toUserId: string | null, groupId: string | null, content: string) => {
    try {
      const id = await sendMessageAction(toUserId, groupId, content);
      if (id) {
        const msg: Message = {
          id,
          fromUserId: userId,
          toUserId: toUserId ?? "",
          groupId,
          content,
          createdAt: new Date().toISOString(),
          readAt: null,
        };
        setCurrentMessages((prev) => [msg, ...prev]);
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

  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + c, 0);

  return {
    conversations, groups, unreadCounts, currentMessages, loaded, totalUnread,
    openConversation, openGroupChat, send, createGroup, refresh: loadConversations,
  };
}
