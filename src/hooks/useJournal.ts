"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { JournalEntry, JournalTag, Visibility, JournalEntryType, JournalAttachment, JournalCollection, JournalDraft, JournalShareLink, CollaborativeEntry } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import {
  fetchJournalCollectionsAction, upsertJournalCollectionAction, deleteJournalCollectionAction,
  fetchJournalDraftsAction, upsertJournalDraftAction, deleteJournalDraftAction,
  createJournalShareLinkAction, deleteJournalShareLinkAction,
  fetchCollaborativeContributionsAction, addCollaborativeContributionAction,
} from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useJournal() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: entries, loaded, key } = useSwrFetch<JournalEntry>("journal_entries", userId);

  // ─── Collections ─────────────────────────────────────
  const [collections, setCollections] = useState<JournalCollection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchJournalCollectionsAction().then((data) => { setCollections(data); setCollectionsLoaded(true); });
  }, [userId]);

  const addCollection = useCallback(async (name: string, description = "") => {
    const col: JournalCollection = { id: generateId(), name, description, entryIds: [], createdAt: new Date().toISOString() };
    await upsertJournalCollectionAction(col as unknown as Record<string, unknown>);
    setCollections((prev) => [col, ...prev]);
    return col;
  }, []);

  const updateCollection = useCallback(async (id: string, updates: Partial<JournalCollection>) => {
    const existing = collections.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await upsertJournalCollectionAction(updated as unknown as Record<string, unknown>);
    setCollections((prev) => prev.map((c) => c.id === id ? updated : c));
  }, [collections]);

  const removeCollection = useCallback(async (id: string) => {
    await deleteJournalCollectionAction(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addEntryToCollection = useCallback(async (collectionId: string, entryId: string) => {
    const col = collections.find((c) => c.id === collectionId);
    if (!col || col.entryIds.includes(entryId)) return;
    await updateCollection(collectionId, { entryIds: [...col.entryIds, entryId] });
  }, [collections, updateCollection]);

  const removeEntryFromCollection = useCallback(async (collectionId: string, entryId: string) => {
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    await updateCollection(collectionId, { entryIds: col.entryIds.filter((id) => id !== entryId) });
  }, [collections, updateCollection]);

  // ─── Drafts (auto-save) ──────────────────────────────
  const [drafts, setDrafts] = useState<JournalDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchJournalDraftsAction().then((data) => { setDrafts(data); setDraftsLoaded(true); });
  }, [userId]);

  const saveDraft = useCallback(async (draft: JournalDraft) => {
    await upsertJournalDraftAction(draft as unknown as Record<string, unknown>);
    setDrafts((prev) => {
      const exists = prev.find((d) => d.id === draft.id);
      if (exists) return prev.map((d) => d.id === draft.id ? draft : d);
      return [draft, ...prev];
    });
  }, []);

  const autoSaveDraft = useCallback((draft: JournalDraft) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraft(draft), 3000);
  }, [saveDraft]);

  const removeDraft = useCallback(async (id: string) => {
    await deleteJournalDraftAction(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ─── Share Links ─────────────────────────────────────
  const createShareLink = useCallback(async (entryId: string, expiresAt: string | null = null) => {
    return createJournalShareLinkAction(entryId, expiresAt);
  }, []);

  const removeShareLink = useCallback(async (linkId: string) => {
    await deleteJournalShareLinkAction(linkId);
  }, []);

  // ─── Collaborative ──────────────────────────────────
  const fetchContributions = useCallback(async (entryId: string): Promise<CollaborativeEntry[]> => {
    return fetchCollaborativeContributionsAction(entryId);
  }, []);

  const addContribution = useCallback(async (entryId: string, content: string) => {
    return addCollaborativeContributionAction(entryId, content);
  }, []);

  // ─── Core CRUD ───────────────────────────────────────
  const add = useCallback(
    async (
      content: string,
      tag: JournalTag | null,
      visibility: Visibility = "private",
      entryType: JournalEntryType = "entry",
      sessionId: string | null = null,
      attachments: JournalAttachment[] = [],
      linkedInteractionIds: string[] = [],
      collectionId: string | null = null,
      isCollaborative = false,
    ) => {
      const item: JournalEntry = {
        id: generateId(), date: new Date().toISOString(), content, tag, visibility, entryType,
        sessionId, attachments, linkedInteractionIds, collectionId, isCollaborative,
        createdAt: new Date().toISOString(),
      };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "journal_entries", payload: item });
        await mutateTable("journal_entries", userId);
        return item;
      }

      await insertRowAction("journal_entries", item);
      await mutateTable("journal_entries", userId);

      // If assigned to a collection, update it
      if (collectionId) {
        addEntryToCollection(collectionId, item.id);
      }

      return item;
    },
    [userId, key, addEntryToCollection]
  );

  const update = useCallback(
    async (id: string, content: string, tag: JournalTag | null, visibility?: Visibility, linkedInteractionIds?: string[], collectionId?: string | null) => {
      const payload: Record<string, unknown> = { content, tag };
      if (visibility !== undefined) payload.visibility = visibility;
      if (linkedInteractionIds !== undefined) payload.linkedInteractionIds = linkedInteractionIds;
      if (collectionId !== undefined) payload.collectionId = collectionId;

      if (!navigator.onLine) {
        const entry = entries.find((e) => e.id === id);
        if (entry && key) await applyCacheUpdate(key, "update", { ...entry, ...payload } as JournalEntry);
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

  // ─── Search & Filtering ──────────────────────────────
  const search = useCallback(
    (query: string) => {
      if (!query.trim()) return entries;
      const lower = query.toLowerCase();
      return entries.filter((e) =>
        e.content.toLowerCase().includes(lower) ||
        (e.tag && e.tag.toLowerCase().includes(lower))
      );
    },
    [entries]
  );

  const filter = useCallback(
    (opts: { tag?: JournalTag | null; visibility?: Visibility; period?: { from: string; to: string }; collectionId?: string }) => {
      let result = entries;
      if (opts.tag !== undefined && opts.tag !== null) result = result.filter((e) => e.tag === opts.tag);
      if (opts.visibility) result = result.filter((e) => e.visibility === opts.visibility);
      if (opts.period) {
        const from = new Date(opts.period.from).getTime();
        const to = new Date(opts.period.to).getTime();
        result = result.filter((e) => { const d = new Date(e.date).getTime(); return d >= from && d <= to; });
      }
      if (opts.collectionId) {
        const col = collections.find((c) => c.id === opts.collectionId);
        if (col) result = result.filter((e) => col.entryIds.includes(e.id));
      }
      return result;
    },
    [entries, collections]
  );

  // ─── Calendar view data ──────────────────────────────
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const date = e.date.split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(e);
    });
    return map;
  }, [entries]);

  // ─── Export ──────────────────────────────────────────
  const exportEntries = useCallback(
    (format: "markdown" | "text", entryIds?: string[]) => {
      const toExport = entryIds ? entries.filter((e) => entryIds.includes(e.id)) : entries;
      if (format === "markdown") {
        return toExport.map((e) => {
          const date = new Date(e.date).toLocaleDateString("fr-FR");
          const tagStr = e.tag ? ` [${e.tag}]` : "";
          // Strip HTML tags for markdown export
          const text = e.content.replace(/<[^>]*>/g, "").trim();
          return `## ${date}${tagStr}\n\n${text}\n`;
        }).join("\n---\n\n");
      }
      // Plain text
      return toExport.map((e) => {
        const date = new Date(e.date).toLocaleDateString("fr-FR");
        const text = e.content.replace(/<[^>]*>/g, "").trim();
        return `[${date}] ${text}`;
      }).join("\n\n");
    },
    [entries]
  );

  return {
    entries, loaded, add, update, remove, getById,
    // Search & Filter
    search, filter, entriesByDate,
    // Collections
    collections, collectionsLoaded, addCollection, updateCollection, removeCollection,
    addEntryToCollection, removeEntryFromCollection,
    // Drafts
    drafts, draftsLoaded, saveDraft, autoSaveDraft, removeDraft,
    // Share
    createShareLink, removeShareLink,
    // Collaborative
    fetchContributions, addContribution,
    // Export
    exportEntries,
  };
}
