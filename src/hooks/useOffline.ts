"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSyncQueue,
  removeSyncEntry,
  type SyncEntry,
} from "@/lib/offlineDb";
import {
  insertRowAction,
  updateRowAction,
  upsertRowAction,
  deleteRowAction,
} from "@/actions/db";
import { mutateTable } from "@/lib/swr";

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

export function useOfflineSync(userId: string) {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // On mount: clear stale queue entries if online (they were from failed attempts)
  useEffect(() => {
    const init = async () => {
      const queue = await getSyncQueue();
      if (navigator.onLine && queue.length > 0) {
        // Try to sync, but if entries fail (already synced via SWR), clear them
        await processQueue();
      }
      const remaining = await getSyncQueue();
      setPendingCount(remaining.length);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      // Sort by creation time (oldest first)
      queue.sort((a, b) => a.createdAt - b.createdAt);

      const affectedTables = new Set<string>();

      const ONE_HOUR = 60 * 60 * 1000;
      for (const entry of queue) {
        // Drop stale entries older than 1 hour
        if (Date.now() - entry.createdAt > ONE_HOUR) {
          await removeSyncEntry(entry.id);
          continue;
        }
        try {
          await executeSyncEntry(entry);
          await removeSyncEntry(entry.id);
          affectedTables.add(entry.table);
        } catch (err) {
          console.error("Sync failed for entry:", entry.id, err);
          // Remove entry that fails to avoid infinite retry loop
          await removeSyncEntry(entry.id);
        }
      }

      // Revalidate affected tables
      for (const table of affectedTables) {
        await mutateTable(table, userId);
      }

      const remaining = await getSyncQueue();
      setPendingCount(remaining.length);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [userId]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      processQueue();
    }
  }, [online, pendingCount, processQueue]);

  return { online, pendingCount, syncing, processQueue };
}

async function executeSyncEntry(entry: SyncEntry) {
  switch (entry.action) {
    case "insert":
      await insertRowAction(entry.table, entry.payload);
      break;
    case "update":
      if (!entry.rowId) throw new Error("Missing rowId for update");
      await updateRowAction(entry.table, entry.rowId, entry.payload);
      break;
    case "upsert":
      await upsertRowAction(entry.table, entry.payload);
      break;
    case "delete":
      if (!entry.rowId) throw new Error("Missing rowId for delete");
      await deleteRowAction(entry.table, entry.rowId);
      break;
  }
}
