"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSessions(getItem<Session[]>(STORAGE_KEYS.SESSIONS, []));
    setLoaded(true);
  }, []);

  const save = useCallback((updated: Session[]) => {
    setSessions(updated);
    setItem(STORAGE_KEYS.SESSIONS, updated);
  }, []);

  const add = useCallback(
    (input: Omit<Session, "id" | "createdAt">) => {
      const item: Session = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      save([item, ...sessions]);
      return item;
    },
    [sessions, save]
  );

  const update = useCallback(
    (id: string, input: Partial<Omit<Session, "id" | "createdAt">>) => {
      save(sessions.map((s) => (s.id === id ? { ...s, ...input } : s)));
    },
    [sessions, save]
  );

  const addInteraction = useCallback(
    (sessionId: string, interactionId: string) => {
      save(sessions.map((s) =>
        s.id === sessionId && !s.interactionIds.includes(interactionId)
          ? { ...s, interactionIds: [...s.interactionIds, interactionId] }
          : s
      ));
    },
    [sessions, save]
  );

  const toggleGoal = useCallback(
    (sessionId: string, goalIndex: number) => {
      save(sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const goals = s.goals.map((g, i) => i === goalIndex ? { ...g, done: !g.done } : g);
        return { ...s, goals };
      }));
    },
    [sessions, save]
  );

  const remove = useCallback(
    (id: string) => { save(sessions.filter((s) => s.id !== id)); },
    [sessions, save]
  );

  const getById = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? null,
    [sessions]
  );

  return { sessions, loaded, add, update, addInteraction, toggleGoal, remove, getById };
}
