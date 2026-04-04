"use client";

import { useState, useEffect, useCallback } from "react";
import type { JournalEntry, JournalTag } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(getItem<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []));
    setLoaded(true);
  }, []);

  const save = useCallback((updated: JournalEntry[]) => {
    setEntries(updated);
    setItem(STORAGE_KEYS.JOURNAL, updated);
  }, []);

  const add = useCallback(
    (content: string, tag: JournalTag | null) => {
      const item: JournalEntry = { id: generateId(), date: new Date().toISOString(), content, tag, createdAt: new Date().toISOString() };
      save([item, ...entries]);
      return item;
    },
    [entries, save]
  );

  const update = useCallback(
    (id: string, content: string, tag: JournalTag | null) => {
      save(entries.map((e) => (e.id === id ? { ...e, content, tag } : e)));
    },
    [entries, save]
  );

  const remove = useCallback(
    (id: string) => { save(entries.filter((e) => e.id !== id)); },
    [entries, save]
  );

  const getById = useCallback(
    (id: string) => entries.find((e) => e.id === id) ?? null,
    [entries]
  );

  return { entries, loaded, add, update, remove, getById };
}
