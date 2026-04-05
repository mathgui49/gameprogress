"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Mission, MissionType, MissionTrackingType } from "@/types";
import { insertRow, updateRow, deleteRow } from "@/lib/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";

export function useMissions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: missions, loaded } = useSwrFetch<Mission>("missions", userId);

  const add = useCallback(
    async (title: string, description: string, type: MissionType, target: number, xpReward: number, trackingType: MissionTrackingType = "custom", deadline: string | null = null) => {
      const item: Mission = { id: generateId(), title, description, type, trackingType, target, current: 0, xpReward, completed: false, deadline, createdAt: new Date().toISOString(), completedAt: null };
      await insertRow("missions", userId, item);
      await mutateTable("missions", userId);
      return item;
    },
    [userId]
  );

  const progress = useCallback(
    async (id: string, amount = 1) => {
      const m = missions.find((m) => m.id === id);
      if (!m || m.completed) return false;
      const newCurrent = Math.min(m.current + amount, m.target);
      const completed = newCurrent >= m.target;
      await updateRow("missions", id, { current: newCurrent, completed, completedAt: completed ? new Date().toISOString() : null });
      await mutateTable("missions", userId);
      return completed;
    },
    [missions, userId]
  );

  const syncAutoProgress = useCallback(
    (counts: Record<string, number>) => {
      missions.forEach((m) => {
        if (m.completed || m.trackingType === "custom") return;
        const realCount = counts[m.trackingType] ?? 0;
        if (realCount === m.current) return;
        const newCurrent = Math.min(realCount, m.target);
        const completed = newCurrent >= m.target;
        updateRow("missions", m.id, { current: newCurrent, completed, completedAt: completed ? new Date().toISOString() : null });
      });
      mutateTable("missions", userId);
    },
    [missions, userId]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Omit<Mission, "id" | "createdAt">>) => {
      await updateRow("missions", id, updates);
      await mutateTable("missions", userId);
    },
    [userId]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRow("missions", id);
      await mutateTable("missions", userId);
    },
    [userId]
  );

  const active = missions.filter((m) => !m.completed);
  const completed = missions.filter((m) => m.completed);

  return { missions, active, completed, loaded, add, progress, syncAutoProgress, update, remove };
}
