"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Mission, MissionType, MissionTrackingType } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useMissions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: missions, loaded, key } = useSwrFetch<Mission>("missions", userId);

  const add = useCallback(
    async (title: string, description: string, type: MissionType, target: number, xpReward: number, trackingType: MissionTrackingType = "custom", deadline: string | null = null) => {
      const item: Mission = { id: generateId(), title, description, type, trackingType, target, current: 0, xpReward, completed: false, deadline, createdAt: new Date().toISOString(), completedAt: null };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "missions", payload: item });
        await mutateTable("missions", userId);
        return item;
      }

      await insertRowAction("missions", item);
      await mutateTable("missions", userId);
      return item;
    },
    [userId, key]
  );

  const progress = useCallback(
    async (id: string, amount = 1) => {
      const m = missions.find((m) => m.id === id);
      if (!m || m.completed) return false;
      const newCurrent = Math.min(m.current + amount, m.target);
      const completed = newCurrent >= m.target;
      const payload = { current: newCurrent, completed, completedAt: completed ? new Date().toISOString() : null };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...m, ...payload });
        await addToSyncQueue({ action: "update", table: "missions", rowId: id, payload });
        await mutateTable("missions", userId);
        return completed;
      }

      await updateRowAction("missions", id, payload);
      await mutateTable("missions", userId);
      return completed;
    },
    [missions, userId, key]
  );

  const syncAutoProgress = useCallback(
    (counts: Record<string, number>) => {
      missions.forEach((m) => {
        if (m.completed || m.trackingType === "custom") return;
        const realCount = counts[m.trackingType] ?? 0;
        if (realCount === m.current) return;
        const newCurrent = Math.min(realCount, m.target);
        const completed = newCurrent >= m.target;
        updateRowAction("missions", m.id, { current: newCurrent, completed, completedAt: completed ? new Date().toISOString() : null });
      });
      mutateTable("missions", userId);
    },
    [missions, userId]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Omit<Mission, "id" | "createdAt">>) => {
      if (!navigator.onLine) {
        const m = missions.find((m) => m.id === id);
        if (m && key) await applyCacheUpdate(key, "update", { ...m, ...updates, id } as Mission);
        await addToSyncQueue({ action: "update", table: "missions", rowId: id, payload: updates });
        await mutateTable("missions", userId);
        return;
      }

      await updateRowAction("missions", id, updates);
      await mutateTable("missions", userId);
    },
    [missions, userId, key]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "delete", { id } as Mission);
        await addToSyncQueue({ action: "delete", table: "missions", rowId: id, payload: {} });
        await mutateTable("missions", userId);
        return;
      }

      await deleteRowAction("missions", id);
      await mutateTable("missions", userId);
    },
    [userId, key]
  );

  const active = missions.filter((m) => !m.completed);
  const completed = missions.filter((m) => m.completed);

  return { missions, active, completed, loaded, add, progress, syncAutoProgress, update, remove };
}
