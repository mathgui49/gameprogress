"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction, fetchAcceptedSessionsForUserAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useSessions() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { data: sessions, loaded: ownLoaded, key } = useSwrFetch<Session>("sessions", userId);
  const [invitedSessions, setInvitedSessions] = useState<Session[]>([]);
  const [invitedLoaded, setInvitedLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAcceptedSessionsForUserAction().then((invited) => {
      setInvitedSessions(invited);
      setInvitedLoaded(true);
    }).catch(() => setInvitedLoaded(true));
  }, [userId]);

  const loaded = ownLoaded && invitedLoaded;

  const add = useCallback(
    async (input: Omit<Session, "id" | "createdAt">) => {
      const item: Session = { ...input, id: generateId(), createdAt: new Date().toISOString() };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "sessions", payload: item });
        await mutateTable("sessions", userId);
        return item;
      }

      await insertRowAction("sessions", item);
      await mutateTable("sessions", userId);
      return item;
    },
    [userId, key]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Session, "id" | "createdAt">>) => {
      if (!navigator.onLine) {
        const sess = sessions.find((s) => s.id === id);
        if (sess && key) await applyCacheUpdate(key, "update", { ...sess, ...input, id } as Session);
        await addToSyncQueue({ action: "update", table: "sessions", rowId: id, payload: input });
        await mutateTable("sessions", userId);
        return;
      }

      await updateRowAction("sessions", id, input);
      await mutateTable("sessions", userId);
    },
    [sessions, userId, key]
  );

  const addInteraction = useCallback(
    async (sessionId: string, interactionId: string) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess || sess.interactionIds.includes(interactionId)) return;
      const payload = { interactionIds: [...sess.interactionIds, interactionId] };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...sess, ...payload });
        await addToSyncQueue({ action: "update", table: "sessions", rowId: sessionId, payload });
        await mutateTable("sessions", userId);
        return;
      }

      await updateRowAction("sessions", sessionId, payload);
      await mutateTable("sessions", userId);
    },
    [sessions, userId, key]
  );

  const toggleGoal = useCallback(
    async (sessionId: string, goalIndex: number) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess) return;
      const goals = sess.goals.map((g, i) => (i === goalIndex ? { ...g, done: !g.done } : g));
      const payload = { goals };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...sess, ...payload });
        await addToSyncQueue({ action: "update", table: "sessions", rowId: sessionId, payload });
        await mutateTable("sessions", userId);
        return;
      }

      await updateRowAction("sessions", sessionId, payload);
      await mutateTable("sessions", userId);
    },
    [sessions, userId, key]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "delete", { id } as Session);
        await addToSyncQueue({ action: "delete", table: "sessions", rowId: id, payload: {} });
        await mutateTable("sessions", userId);
        return;
      }

      await deleteRowAction("sessions", id);
      await mutateTable("sessions", userId);
    },
    [userId, key]
  );

  const getById = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? invitedSessions.find((s) => s.id === id) ?? null,
    [sessions, invitedSessions]
  );

  const allSessions = [...sessions, ...invitedSessions];

  return { sessions, invitedSessions, allSessions, loaded, add, update, addInteraction, toggleGoal, remove, getById };
}
