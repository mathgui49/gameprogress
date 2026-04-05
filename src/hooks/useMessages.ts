"use client";

import { useState, useCallback, useEffect } from "react";
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

  const openConversation = useCallback(async (otherUserId: string) => {
    const messages = await fetchMessagesAction(otherUserId);
    setCurrentMessages(messages);
    await markMessagesReadAction(otherUserId);
    setUnreadCounts((prev) => ({ ...prev, [otherUserId]: 0 }));
  }, []);

  const openGroupChat = useCallback(async (groupId: string) => {
    const messages = await fetchGroupMessagesAction(groupId);
    setCurrentMessages(messages);
  }, []);

  const send = useCallback(async (toUserId: string | null, groupId: string | null, content: string) => {
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
