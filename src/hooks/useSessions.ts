"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "@/types";
import { fetchAll, insertRow, updateRow, deleteRow, fetchAcceptedSessionsForUser } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function useSessions() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [sessions, setSessions] = useState<Session[]>([]);
  const [invitedSessions, setInvitedSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetchAll<Session>("sessions", userId),
      fetchAcceptedSessionsForUser(userId),
    ]).then(([own, invited]) => {
      setSessions(own);
      setInvitedSessions(invited);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (input: Omit<Session, "id" | "createdAt">) => {
      const item: Session = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      setSessions((prev) => [item, ...prev]);
      insertRow("sessions", userId, item);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    (id: string, input: Partial<Omit<Session, "id" | "createdAt">>) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...input } : s)));
      updateRow("sessions", id, input);
    },
    []
  );

  const addInteraction = useCallback(
    (sessionId: string, interactionId: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId || s.interactionIds.includes(interactionId)) return s;
          const interactionIds = [...s.interactionIds, interactionId];
          updateRow("sessions", sessionId, { interactionIds });
          return { ...s, interactionIds };
        })
      );
    },
    []
  );

  const toggleGoal = useCallback(
    (sessionId: string, goalIndex: number) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const goals = s.goals.map((g, i) => (i === goalIndex ? { ...g, done: !g.done } : g));
          updateRow("sessions", sessionId, { goals });
          return { ...s, goals };
        })
      );
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      deleteRow("sessions", id);
    },
    []
  );

  const getById = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? invitedSessions.find((s) => s.id === id) ?? null,
    [sessions, invitedSessions]
  );

  // All sessions (own + invited) for calendar etc.
  const allSessions = [...sessions, ...invitedSessions];

  return { sessions, invitedSessions, allSessions, loaded, add, update, addInteraction, toggleGoal, remove, getById };
}
