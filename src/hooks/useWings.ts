"use client";

import { useState, useEffect, useCallback } from "react";
import type { Wing } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export function useWings() {
  const [wings, setWings] = useState<Wing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setWings(getItem<Wing[]>(STORAGE_KEYS.WINGS, []));
    setLoaded(true);
  }, []);

  const save = useCallback((updated: Wing[]) => {
    setWings(updated);
    setItem(STORAGE_KEYS.WINGS, updated);
  }, []);

  const add = useCallback(
    (name: string, notes = "") => {
      const item: Wing = { id: generateId(), name: name.trim(), notes, sessionCount: 0, createdAt: new Date().toISOString() };
      save([item, ...wings]);
      return item;
    },
    [wings, save]
  );

  const update = useCallback(
    (id: string, updates: Partial<Pick<Wing, "name" | "notes">>) => {
      save(wings.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    },
    [wings, save]
  );

  const incrementSessionCount = useCallback(
    (id: string) => {
      save(wings.map((w) => (w.id === id ? { ...w, sessionCount: w.sessionCount + 1 } : w)));
    },
    [wings, save]
  );

  const remove = useCallback(
    (id: string) => { save(wings.filter((w) => w.id !== id)); },
    [wings, save]
  );

  const getById = useCallback(
    (id: string) => wings.find((w) => w.id === id) ?? null,
    [wings]
  );

  return { wings, loaded, add, update, incrementSessionCount, remove, getById };
}
