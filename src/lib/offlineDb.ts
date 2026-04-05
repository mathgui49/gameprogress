"use client";

const DB_NAME = "gameprogress-offline";
const DB_VERSION = 2;
const CACHE_STORE = "cache";
const QUEUE_STORE = "syncQueue";

export interface SyncEntry {
  id: string;
  action: "insert" | "update" | "upsert" | "delete";
  table: string;
  payload: any;
  /** Secondary ID for update/delete */
  rowId?: string;
  createdAt: number;
  /** Retry tracking */
  retryCount: number;
  lastError?: string;
}

/** Sync result reported to the UI */
export interface SyncReport {
  synced: number;
  failed: number;
  errors: string[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Cache (table data) ──────────────────────────────────

export async function getCachedData<T>(key: string): Promise<T[] | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T[]): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail — offline cache is best-effort
  }
}

// ─── Sync queue ──────────────────────────────────────────

const MAX_RETRIES = 5;

/**
 * Add an entry to the sync queue. Deduplicates update/upsert actions
 * for the same table+rowId by replacing the old entry (last-write-wins).
 */
export async function addToSyncQueue(entry: Omit<SyncEntry, "id" | "createdAt" | "retryCount">): Promise<void> {
  try {
    const db = await openDb();

    // Deduplicate: if there's already a pending update/upsert for same table+rowId, replace it
    if ((entry.action === "update" || entry.action === "upsert") && entry.rowId) {
      const existing = await findEntryByTableAndRow(db, entry.table, entry.rowId);
      if (existing && (existing.action === "update" || existing.action === "upsert")) {
        // Merge payloads (new values override old), keep the original createdAt
        const merged: SyncEntry = {
          ...existing,
          payload: { ...existing.payload, ...entry.payload },
          action: entry.action,
          retryCount: 0,
          lastError: undefined,
        };
        return new Promise((resolve) => {
          const tx = db.transaction(QUEUE_STORE, "readwrite");
          tx.objectStore(QUEUE_STORE).put(merged);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    }

    const item: SyncEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retryCount: 0,
    };
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Best-effort queue
  }
}

/** Find an existing queue entry matching table + rowId */
function findEntryByTableAndRow(db: IDBDatabase, table: string, rowId: string): Promise<SyncEntry | null> {
  return new Promise((resolve) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => {
      const match = (req.result as SyncEntry[]).find(
        (e) => e.table === table && e.rowId === rowId
      );
      resolve(match ?? null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function getSyncQueue(): Promise<SyncEntry[]> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeSyncEntry(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

/** Update an entry in place (for retry tracking) */
export async function updateSyncEntry(entry: SyncEntry): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

export { MAX_RETRIES };

// ─── Optimistic local update ─────────────────────────────

export async function applyCacheUpdate<T extends { id: string }>(
  key: string,
  action: "insert" | "update" | "delete",
  item: T,
): Promise<T[]> {
  const current = (await getCachedData<T>(key)) ?? [];
  let updated: T[];

  switch (action) {
    case "insert":
      updated = [item, ...current];
      break;
    case "update":
      updated = current.map((c) => (c.id === item.id ? { ...c, ...item } : c));
      break;
    case "delete":
      updated = current.filter((c) => c.id !== item.id);
      break;
  }

  await setCachedData(key, updated);
  return updated;
}
