"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Wing } from "@/types";
import { fetchAllAction, insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { generateId } from "@/lib/utils";

export function useWings() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [wings, setWings] = useState<Wing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAllAction<Wing>("wings").then((data) => {
      setWings(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (name: string, notes = "") => {
      const item: Wing = { id: generateId(), name: name.trim(), notes, sessionCount: 0, createdAt: new Date().toISOString() };
      setWings((prev) => [item, ...prev]);
      insertRowAction("wings", item);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    (id: string, updates: Partial<Pick<Wing, "name" | "notes">>) => {
      setWings((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
      updateRowAction("wings", id, updates);
    },
    [userId]
  );

  const incrementSessionCount = useCallback(
    (id: string) => {
      setWings((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          const sessionCount = w.sessionCount + 1;
          updateRowAction("wings", id, { sessionCount });
          return { ...w, sessionCount };
        })
      );
    },
    [userId]
  );

  const remove = useCallback(
    (id: string) => {
      setWings((prev) => prev.filter((w) => w.id !== id));
      deleteRowAction("wings", id);
    },
    [userId]
  );

  const getById = useCallback(
    (id: string) => wings.find((w) => w.id === id) ?? null,
    [wings]
  );

  return { wings, loaded, add, update, incrementSessionCount, remove, getById };
}
