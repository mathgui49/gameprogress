"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { GamificationState, XPEvent } from "@/types";
import { xpForLevel } from "@/types";
import { fetchOneAction, upsertRowAction } from "@/actions/db";
import { generateDefaultGamification } from "@/lib/seed";
import { generateId } from "@/lib/utils";

export function useGamification() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [state, setState] = useState<GamificationState>(generateDefaultGamification());
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!userId) return;
    fetchOneAction<GamificationState>("gamification").then((data) => {
      if (data) setState(data);
      setLoaded(true);
    });
  }, [userId]);

  const persist = useCallback(
    (updated: GamificationState) => {
      setState(updated);
      stateRef.current = updated;
      upsertRowAction("gamification", updated);
    },
    [userId]
  );

  const addXP = useCallback(
    (amount: number, reason: string) => {
      const current = stateRef.current;
      const event: XPEvent = { id: generateId(), amount, reason, date: new Date().toISOString() };
      let newXP = current.xp + amount;
      let newLevel = current.level;
      while (newXP >= xpForLevel(newLevel)) {
        newXP -= xpForLevel(newLevel);
        newLevel++;
      }
      const updated = { ...current, xp: newXP, level: newLevel, xpEvents: [event, ...current.xpEvents.slice(0, 49)] };
      persist(updated);
    },
    [persist]
  );

  const updateStreak = useCallback(() => {
    const current = stateRef.current;
    const today = new Date().toISOString().split("T")[0];
    if (current.lastActiveDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = current.lastActiveDate === yesterday ? current.streak + 1 : 1;
    const updated = {
      ...current,
      streak: newStreak,
      bestStreak: Math.max(newStreak, current.bestStreak),
      lastActiveDate: today,
    };
    persist(updated);
  }, [persist]);

  const unlockBadge = useCallback(
    (badgeId: string) => {
      const current = stateRef.current;
      persist({
        ...current,
        badges: current.badges.map((b) =>
          b.id === badgeId && !b.unlockedAt ? { ...b, unlockedAt: new Date().toISOString() } : b
        ),
      });
    },
    [persist]
  );

  const updateMilestone = useCallback(
    (milestoneId: string, current: number) => {
      const s = stateRef.current;
      persist({
        ...s,
        milestones: s.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const unlocked = current >= m.target && !m.unlockedAt;
          return { ...m, current, unlockedAt: unlocked ? new Date().toISOString() : m.unlockedAt };
        }),
      });
    },
    [persist]
  );

  const xpForNext = xpForLevel(state.level);
  const xpProgress = xpForNext > 0 ? Math.min((state.xp / xpForNext) * 100, 100) : 0;

  return { ...state, loaded, addXP, updateStreak, unlockBadge, updateMilestone, xpForNext, xpProgress };
}
