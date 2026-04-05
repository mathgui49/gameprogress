"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { JournalEntry, JournalTag, Visibility } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";

export function useJournal() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: entries, loaded } = useSwrFetch<JournalEntry>("journal_entries", userId);

  const add = useCallback(
    async (content: string, tag: JournalTag | null, visibility: Visibility = "private") => {
      const item: JournalEntry = { id: generateId(), date: new Date().toISOString(), content, tag, visibility, createdAt: new Date().toISOString() };
      await insertRowAction("journal_entries", item);
      await mutateTable("journal_entries", userId);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    async (id: string, content: string, tag: JournalTag | null, visibility?: Visibility) => {
      await updateRowAction("journal_entries", id, { content, tag, ...(visibility !== undefined ? { visibility } : {}) });
      await mutateTable("journal_entries", userId);
    },
    [userId]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRowAction("journal_entries", id);
      await mutateTable("journal_entries", userId);
    },
    [userId]
  );

  const getById = useCallback(
    (id: string) => entries.find((e) => e.id === id) ?? null,
    [entries]
  );

  return { entries, loaded, add, update, remove, getById };
}
