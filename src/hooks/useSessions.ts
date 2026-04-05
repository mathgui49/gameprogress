"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction, fetchAcceptedSessionsForUserAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";

export function useSessions() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { data: sessions, loaded: ownLoaded } = useSwrFetch<Session>("sessions", userId);
  const [invitedSessions, setInvitedSessions] = useState<Session[]>([]);
  const [invitedLoaded, setInvitedLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAcceptedSessionsForUserAction().then((invited) => {
      setInvitedSessions(invited);
      setInvitedLoaded(true);
    });
  }, [userId]);

  const loaded = ownLoaded && invitedLoaded;

  const add = useCallback(
    async (input: Omit<Session, "id" | "createdAt">) => {
      const item: Session = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      await insertRowAction("sessions", item);
      await mutateTable("sessions", userId);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Session, "id" | "createdAt">>) => {
      await updateRowAction("sessions", id, input);
      await mutateTable("sessions", userId);
    },
    [userId]
  );

  const addInteraction = useCallback(
    async (sessionId: string, interactionId: string) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess || sess.interactionIds.includes(interactionId)) return;
      await updateRowAction("sessions", sessionId, { interactionIds: [...sess.interactionIds, interactionId] });
      await mutateTable("sessions", userId);
    },
    [sessions, userId]
  );

  const toggleGoal = useCallback(
    async (sessionId: string, goalIndex: number) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess) return;
      const goals = sess.goals.map((g, i) => (i === goalIndex ? { ...g, done: !g.done } : g));
      await updateRowAction("sessions", sessionId, { goals });
      await mutateTable("sessions", userId);
    },
    [sessions, userId]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRowAction("sessions", id);
      await mutateTable("sessions", userId);
    },
    [userId]
  );

  const getById = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? invitedSessions.find((s) => s.id === id) ?? null,
    [sessions, invitedSessions]
  );

  const allSessions = [...sessions, ...invitedSessions];

  return { sessions, invitedSessions, allSessions, loaded, add, update, addInteraction, toggleGoal, remove, getById };
}
