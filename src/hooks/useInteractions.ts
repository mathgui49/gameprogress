"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Interaction } from "@/types";
import { insertRow, updateRow, deleteRow } from "@/lib/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";

export function useInteractions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: interactions, loaded } = useSwrFetch<Interaction>("interactions", userId);

  const add = useCallback(
    async (input: Omit<Interaction, "id" | "createdAt">) => {
      const item: Interaction = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      await insertRow("interactions", userId, item);
      await mutateTable("interactions", userId);
      return item;
    },
    [userId]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Interaction, "id" | "createdAt">>) => {
      await updateRow("interactions", id, input);
      await mutateTable("interactions", userId);
    },
    [userId]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRow("interactions", id);
      await mutateTable("interactions", userId);
    },
    [userId]
  );

  const getById = useCallback(
    (id: string) => interactions.find((i) => i.id === id) ?? null,
    [interactions]
  );

  return { interactions, loaded, add, update, remove, getById };
}
