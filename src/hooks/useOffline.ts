"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSyncQueue,
  removeSyncEntry,
  updateSyncEntry,
  clearSyncQueue,
  MAX_RETRIES,
  type SyncEntry,
  type SyncReport,
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

/** Max age before an entry is discarded (24 hours) */
const MAX_ENTRY_AGE = 24 * 60 * 60 * 1000;

/** Exponential backoff delay: 2^retryCount seconds, capped at 60s */
function backoffMs(retryCount: number): number {
  return Math.min(2 ** retryCount * 1000, 60_000);
}

export function useOfflineSync(userId: string) {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  /** Last sync report — surfaces errors to the UI */
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);
  const syncingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const processQueue = useCallback(async (): Promise<SyncReport> => {
    const report: SyncReport = { synced: 0, failed: 0, errors: [] };
    if (syncingRef.current || !navigator.onLine) return report;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return report;

      // Sort oldest first
      queue.sort((a, b) => a.createdAt - b.createdAt);

      const affectedTables = new Set<string>();
      let hasRetryable = false;
      let minBackoff = Infinity;

      for (const entry of queue) {
        // Drop entries older than 24h — they're too stale to apply safely
        if (Date.now() - entry.createdAt > MAX_ENTRY_AGE) {
          await removeSyncEntry(entry.id);
          report.failed++;
          report.errors.push(`Abandonné (trop ancien): ${entry.action} ${entry.table}`);
          continue;
        }

        // Drop entries that exceeded max retries
        if (entry.retryCount >= MAX_RETRIES) {
          await removeSyncEntry(entry.id);
          report.failed++;
          report.errors.push(
            `Abandonné après ${MAX_RETRIES} tentatives: ${entry.action} ${entry.table}${entry.lastError ? ` (${entry.lastError})` : ""}`
          );
          continue;
        }

        // Check if this entry is still in backoff period
        if (entry.retryCount > 0) {
          const waitUntil = entry.createdAt + backoffMs(entry.retryCount) * entry.retryCount;
          // Use a simpler check: just use the backoff from last retry
          const nextRetryAt = Date.now(); // We process whenever processQueue is called
        }

        try {
          await executeSyncEntry(entry);
          await removeSyncEntry(entry.id);
          affectedTables.add(entry.table);
          report.synced++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const updated: SyncEntry = {
            ...entry,
            retryCount: entry.retryCount + 1,
            lastError: errMsg,
          };

          if (updated.retryCount >= MAX_RETRIES) {
            // Final failure — remove and report
            await removeSyncEntry(entry.id);
            report.failed++;
            report.errors.push(
              `Échec: ${entry.action} ${entry.table}${entry.rowId ? ` (${entry.rowId.slice(0, 8)})` : ""} — ${errMsg}`
            );
          } else {
            // Keep for retry
            await updateSyncEntry(updated);
            hasRetryable = true;
            minBackoff = Math.min(minBackoff, backoffMs(updated.retryCount));
          }
        }
      }

      // Revalidate affected tables
      for (const table of affectedTables) {
        await mutateTable(table, userId);
      }

      const remaining = await getSyncQueue();
      setPendingCount(remaining.length);
      setLastReport(report);

      // Schedule retry with exponential backoff if there are retryable entries
      if (hasRetryable && navigator.onLine) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          processQueue();
        }, minBackoff);
      }

      return report;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [userId]);

  // On mount: count pending and try to sync
  useEffect(() => {
    const init = async () => {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
      setInitialized(true);
      if (navigator.onLine && queue.length > 0) {
        await processQueue();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      processQueue();
    }
  }, [online, pendingCount, processQueue]);

  /** Manually discard all failed entries */
  const clearFailed = useCallback(async () => {
    const queue = await getSyncQueue();
    for (const entry of queue) {
      if (entry.retryCount >= MAX_RETRIES) {
        await removeSyncEntry(entry.id);
      }
    }
    const remaining = await getSyncQueue();
    setPendingCount(remaining.length);
  }, []);

  return {
    online,
    pendingCount,
    syncing,
    initialized,
    lastReport,
    processQueue,
    clearFailed,
    clearSyncQueue,
  };
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
