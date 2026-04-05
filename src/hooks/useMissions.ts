"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Mission, MissionType, MissionTrackingType } from "@/types";
import { fetchAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function useMissions() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAll<Mission>("missions", userId).then((data) => {
      setMissions(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (title: string, description: string, type: MissionType, target: number, xpReward: number, trackingType: MissionTrackingType = "custom", deadline: string | null = null) => {
      const item: Mission = { id: generateId(), title, description, type, trackingType, target, current: 0, xpReward, completed: false, deadline, createdAt: new Date().toISOString(), completedAt: null };
      setMissions((prev) => [item, ...prev]);
      insertRow("missions", userId, item);
      return item;
    },
    [userId]
  );

  const progress = useCallback(
    (id: string, amount = 1) => {
      setMissions((prev) =>
        prev.map((m) => {
          if (m.id !== id || m.completed) return m;
          const newCurrent = Math.min(m.current + amount, m.target);
          const completed = newCurrent >= m.target;
          const completedAt = completed ? new Date().toISOString() : null;
          updateRow("missions", id, { current: newCurrent, completed, completedAt });
          return { ...m, current: newCurrent, completed, completedAt };
        })
      );
    },
    []
  );

  const syncAutoProgress = useCallback(
    (counts: Record<string, number>) => {
      setMissions((prev) =>
        prev.map((m) => {
          if (m.completed || m.trackingType === "custom") return m;
          const realCount = counts[m.trackingType] ?? 0;
          if (realCount === m.current) return m;
          const newCurrent = Math.min(realCount, m.target);
          const completed = newCurrent >= m.target;
          const completedAt = completed ? new Date().toISOString() : null;
          updateRow("missions", m.id, { current: newCurrent, completed, completedAt });
          return { ...m, current: newCurrent, completed, completedAt };
        })
      );
    },
    []
  );

  const update = useCallback(
    (id: string, updates: Partial<Omit<Mission, "id" | "createdAt">>) => {
      setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
      updateRow("missions", id, updates);
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setMissions((prev) => prev.filter((m) => m.id !== id));
      deleteRow("missions", id);
    },
    []
  );

  const active = missions.filter((m) => !m.completed);
  const completed = missions.filter((m) => m.completed);

  return { missions, active, completed, loaded, add, progress, syncAutoProgress, update, remove };
}
