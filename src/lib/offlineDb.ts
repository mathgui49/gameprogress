"use client";

const DB_NAME = "gameprogress-offline";
const DB_VERSION = 2;
const CACHE_STORE = "cache";
const QUEUE_STORE = "syncQueue";

// ─── Simple encryption for cached data ──────────────────
// Uses AES-GCM with a key derived from a stable seed (user session).
// This protects data at rest on shared/stolen devices.

let _cryptoKey: CryptoKey | null = null;

/** Derive an AES-GCM key from a passphrase (e.g. user email hash). */
async function getCryptoKey(seed: string): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(seed), "PBKDF2", false, ["deriveKey"]);
  _cryptoKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("gameprogress-salt"), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return _cryptoKey;
}

async function encryptData(data: string, seed: string): Promise<ArrayBuffer> {
  const key = await getCryptoKey(seed);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return result.buffer;
}

async function decryptData(buffer: ArrayBuffer, seed: string): Promise<string> {
  const key = await getCryptoKey(seed);
  const arr = new Uint8Array(buffer);
  const iv = arr.slice(0, 12);
  const ciphertext = arr.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/** Encryption seed — set by the app once session is available. */
let _encryptionSeed: string | null = null;

export function setEncryptionSeed(seed: string) {
  _encryptionSeed = seed;
  _cryptoKey = null; // Re-derive key for new seed
}

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
    const raw: unknown = await new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
    if (raw === null || raw === undefined) return null;
    // Encrypted data is stored as ArrayBuffer
    if (_encryptionSeed && raw instanceof ArrayBuffer) {
      try {
        const json = await decryptData(raw, _encryptionSeed);
        return JSON.parse(json) as T[];
      } catch {
        return null; // Decryption failed (e.g. different seed) — treat as cache miss
      }
    }
    return raw as T[];
  } catch {
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T[]): Promise<void> {
  try {
    const db = await openDb();
    let storeValue: T[] | ArrayBuffer = data;
    if (_encryptionSeed) {
      try {
        storeValue = await encryptData(JSON.stringify(data), _encryptionSeed);
      } catch {
        storeValue = data; // Fallback to unencrypted if crypto fails
      }
    }
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.put(storeValue, key);
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
