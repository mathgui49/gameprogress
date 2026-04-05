"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { JournalEntry, JournalTag, Visibility } from "@/types";
import { fetchAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function useJournal() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAll<JournalEntry>("journal_entries", userId).then((data) => {
      setEntries(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (content: string, tag: JournalTag | null, visibility: Visibility = "private") => {
      const item: JournalEntry = { id: generateId(), date: new Date().toISOString(), content, tag, visibility, createdAt: new Date().toISOString() };
      setEntries((prev) => [item, ...prev]);
      insertRow("journal_entries", userId, item);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    (id: string, content: string, tag: JournalTag | null, visibility?: Visibility) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content, tag, ...(visibility !== undefined ? { visibility } : {}) } : e)));
      updateRow("journal_entries", id, { content, tag, ...(visibility !== undefined ? { visibility } : {}) });
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      deleteRow("journal_entries", id);
    },
    []
  );

  const getById = useCallback(
    (id: string) => entries.find((e) => e.id === id) ?? null,
    [entries]
  );

  return { entries, loaded, add, update, remove, getById };
}
