"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Interaction } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useInteractions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: interactions, loaded, key } = useSwrFetch<Interaction>("interactions", userId);

  const add = useCallback(
    async (input: Omit<Interaction, "id" | "createdAt">) => {
      const item: Interaction = { ...input, id: generateId(), createdAt: new Date().toISOString() };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "interactions", payload: item });
        await mutateTable("interactions", userId);
        return item;
      }

      await insertRowAction("interactions", item);
      await mutateTable("interactions", userId);
      return item;
    },
    [userId, key]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Interaction, "id" | "createdAt">>) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { id, ...input } as Interaction);
        await addToSyncQueue({ action: "update", table: "interactions", rowId: id, payload: input });
        await mutateTable("interactions", userId);
        return;
      }

      await updateRowAction("interactions", id, input);
      await mutateTable("interactions", userId);
    },
    [userId, key]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "delete", { id } as Interaction);
        await addToSyncQueue({ action: "delete", table: "interactions", rowId: id, payload: {} });
        await mutateTable("interactions", userId);
        return;
      }

      await deleteRowAction("interactions", id);
      await mutateTable("interactions", userId);
    },
    [userId, key]
  );

  const getById = useCallback(
    (id: string) => interactions.find((i) => i.id === id) ?? null,
    [interactions]
  );

  return { interactions, loaded, add, update, remove, getById };
}
