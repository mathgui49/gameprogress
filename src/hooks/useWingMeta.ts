"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WingMeta, WingCategory, WingNote } from "@/types";
import { fetchWingMetaAction, upsertWingMetaAction } from "@/actions/db";
import { generateId } from "@/lib/utils";

export function useWingMeta() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [meta, setMeta] = useState<WingMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchWingMetaAction().then((data) => {
      setMeta(data);
      setLoaded(true);
    });
  }, [userId]);

  const getMetaFor = useCallback(
    (wingUserId: string): WingMeta | null => meta.find((m) => m.wingUserId === wingUserId) ?? null,
    [meta]
  );

  const setCategory = useCallback(async (wingUserId: string, category: WingCategory | null) => {
    await upsertWingMetaAction(wingUserId, { category });
    setMeta((prev) => {
      const existing = prev.find((m) => m.wingUserId === wingUserId);
      if (existing) return prev.map((m) => m.wingUserId === wingUserId ? { ...m, category } : m);
      return [...prev, { wingUserId, category, notes: [], sharedSessionStreak: 0, bestSharedStreak: 0, lastSharedSessionDate: null }];
    });
  }, []);

  const addNote = useCallback(async (wingUserId: string, content: string) => {
    const existing = meta.find((m) => m.wingUserId === wingUserId);
    const notes: WingNote[] = [...(existing?.notes || []), { id: generateId(), wingUserId, content, createdAt: new Date().toISOString() }];
    await upsertWingMetaAction(wingUserId, { notes });
    setMeta((prev) => {
      const ex = prev.find((m) => m.wingUserId === wingUserId);
      if (ex) return prev.map((m) => m.wingUserId === wingUserId ? { ...m, notes } : m);
      return [...prev, { wingUserId, category: null, notes, sharedSessionStreak: 0, bestSharedStreak: 0, lastSharedSessionDate: null }];
    });
  }, [meta]);

  const removeNote = useCallback(async (wingUserId: string, noteId: string) => {
    const existing = meta.find((m) => m.wingUserId === wingUserId);
    const notes = (existing?.notes || []).filter((n) => n.id !== noteId);
    await upsertWingMetaAction(wingUserId, { notes });
    setMeta((prev) => prev.map((m) => m.wingUserId === wingUserId ? { ...m, notes } : m));
  }, [meta]);

  const updateSharedStreak = useCallback(async (wingUserId: string) => {
    const existing = meta.find((m) => m.wingUserId === wingUserId);
    const today = new Date().toISOString().split("T")[0];
    const lastDate = existing?.lastSharedSessionDate?.split("T")[0];

    if (lastDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = lastDate === yesterday ? (existing?.sharedSessionStreak ?? 0) + 1 : 1;
    const bestStreak = Math.max(newStreak, existing?.bestSharedStreak ?? 0);

    await upsertWingMetaAction(wingUserId, {
      sharedSessionStreak: newStreak,
      bestSharedStreak: bestStreak,
      lastSharedSessionDate: new Date().toISOString(),
    });
    setMeta((prev) => prev.map((m) =>
      m.wingUserId === wingUserId
        ? { ...m, sharedSessionStreak: newStreak, bestSharedStreak: bestStreak, lastSharedSessionDate: new Date().toISOString() }
        : m
    ));
  }, [meta]);

  return { meta, loaded, getMetaFor, setCategory, addNote, removeNote, updateSharedStreak };
}
