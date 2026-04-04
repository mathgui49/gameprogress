"use client";

import { useState, useEffect, useCallback } from "react";
import type { Mission, MissionType } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateSeedMissions } from "@/lib/seed";
import { generateId } from "@/lib/utils";

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = getItem<Mission[]>(STORAGE_KEYS.MISSIONS, []);
    setMissions(data.length > 0 ? data : generateSeedMissions());
    setLoaded(true);
  }, []);

  const save = useCallback((updated: Mission[]) => {
    setMissions(updated);
    setItem(STORAGE_KEYS.MISSIONS, updated);
  }, []);

  const add = useCallback(
    (title: string, description: string, type: MissionType, target: number, xpReward: number) => {
      const item: Mission = { id: generateId(), title, description, type, target, current: 0, xpReward, completed: false, createdAt: new Date().toISOString(), completedAt: null };
      save([item, ...missions]);
      return item;
    },
    [missions, save]
  );

  const progress = useCallback(
    (id: string, amount = 1) => {
      save(
        missions.map((m) => {
          if (m.id !== id || m.completed) return m;
          const newCurrent = Math.min(m.current + amount, m.target);
          const completed = newCurrent >= m.target;
          return { ...m, current: newCurrent, completed, completedAt: completed ? new Date().toISOString() : null };
        })
      );
    },
    [missions, save]
  );

  const remove = useCallback(
    (id: string) => { save(missions.filter((m) => m.id !== id)); },
    [missions, save]
  );

  const active = missions.filter((m) => !m.completed);
  const completed = missions.filter((m) => m.completed);

  return { missions, active, completed, loaded, add, progress, remove };
}
