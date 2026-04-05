"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Interaction } from "@/types";
import { fetchAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function useInteractions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAll<Interaction>("interactions", userId).then((data) => {
      setInteractions(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (input: Omit<Interaction, "id" | "createdAt">) => {
      const item: Interaction = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      setInteractions((prev) => [item, ...prev]);
      insertRow("interactions", userId, item);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    (id: string, input: Partial<Omit<Interaction, "id" | "createdAt">>) => {
      setInteractions((prev) => prev.map((i) => (i.id === id ? { ...i, ...input } : i)));
      updateRow("interactions", id, input);
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setInteractions((prev) => prev.filter((i) => i.id !== id));
      deleteRow("interactions", id);
    },
    []
  );

  const getById = useCallback(
    (id: string) => interactions.find((i) => i.id === id) ?? null,
    [interactions]
  );

  const reset = useCallback(() => { /* no-op for Supabase */ }, []);
  const clear = useCallback(() => { setInteractions([]); }, []);

  return { interactions, loaded, add, update, remove, getById, reset, clear };
}
