"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { JournalEntry, JournalTag, Visibility, JournalEntryType, JournalAttachment } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useJournal() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: entries, loaded, key } = useSwrFetch<JournalEntry>("journal_entries", userId);

  const add = useCallback(
    async (content: string, tag: JournalTag | null, visibility: Visibility = "private", entryType: JournalEntryType = "entry", sessionId: string | null = null, attachments: JournalAttachment[] = []) => {
      const item: JournalEntry = { id: generateId(), date: new Date().toISOString(), content, tag, visibility, entryType, sessionId, attachments, createdAt: new Date().toISOString() };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "journal_entries", payload: item });
        await mutateTable("journal_entries", userId);
        return item;
      }

      await insertRowAction("journal_entries", item);
      await mutateTable("journal_entries", userId);
      return item;
    },
    [userId, key]
  );

  const update = useCallback(
    async (id: string, content: string, tag: JournalTag | null, visibility?: Visibility) => {
      const payload = { content, tag, ...(visibility !== undefined ? { visibility } : {}) };

      if (!navigator.onLine) {
        const entry = entries.find((e) => e.id === id);
        if (entry && key) await applyCacheUpdate(key, "update", { ...entry, ...payload });
        await addToSyncQueue({ action: "update", table: "journal_entries", rowId: id, payload });
        await mutateTable("journal_entries", userId);
        return;
      }

      await updateRowAction("journal_entries", id, payload);
      await mutateTable("journal_entries", userId);
    },
    [entries, userId, key]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "delete", { id } as JournalEntry);
        await addToSyncQueue({ action: "delete", table: "journal_entries", rowId: id, payload: {} });
        await mutateTable("journal_entries", userId);
        return;
      }

      await deleteRowAction("journal_entries", id);
      await mutateTable("journal_entries", userId);
    },
    [userId, key]
  );

  const getById = useCallback(
    (id: string) => entries.find((e) => e.id === id) ?? null,
    [entries]
  );

  return { entries, loaded, add, update, remove, getById };
}
