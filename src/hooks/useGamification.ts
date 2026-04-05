"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { GamificationState, XPEvent } from "@/types";
import { xpForLevel } from "@/types";
import { fetchOne, upsertRow } from "@/lib/db";
import { generateDefaultGamification } from "@/lib/seed";
import { generateId } from "@/lib/utils";

export function useGamification() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [state, setState] = useState<GamificationState>(generateDefaultGamification());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchOne<GamificationState>("gamification", userId).then((data) => {
      if (data) setState(data);
      setLoaded(true);
    });
  }, [userId]);

  const save = useCallback(
    (updated: GamificationState) => {
      setState(updated);
      upsertRow("gamification", userId, updated);
    },
    [userId]
  );

  const addXP = useCallback(
    (amount: number, reason: string) => {
      const event: XPEvent = { id: generateId(), amount, reason, date: new Date().toISOString() };
      let newXP = state.xp + amount;
      let newLevel = state.level;
      while (newXP >= xpForLevel(newLevel)) {
        newXP -= xpForLevel(newLevel);
        newLevel++;
      }
      save({ ...state, xp: newXP, level: newLevel, xpEvents: [event, ...state.xpEvents.slice(0, 49)] });
    },
    [state, save]
  );

  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    if (state.lastActiveDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = state.lastActiveDate === yesterday ? state.streak + 1 : 1;
    save({
      ...state,
      streak: newStreak,
      bestStreak: Math.max(newStreak, state.bestStreak),
      lastActiveDate: today,
    });
  }, [state, save]);

  const unlockBadge = useCallback(
    (badgeId: string) => {
      save({
        ...state,
        badges: state.badges.map((b) =>
          b.id === badgeId && !b.unlockedAt ? { ...b, unlockedAt: new Date().toISOString() } : b
        ),
      });
    },
    [state, save]
  );

  const updateMilestone = useCallback(
    (milestoneId: string, current: number) => {
      save({
        ...state,
        milestones: state.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const unlocked = current >= m.target && !m.unlockedAt;
          return { ...m, current, unlockedAt: unlocked ? new Date().toISOString() : m.unlockedAt };
        }),
      });
    },
    [state, save]
  );

  const xpForNext = xpForLevel(state.level);
  const xpProgress = xpForNext > 0 ? Math.min((state.xp / xpForNext) * 100, 100) : 0;

  return { ...state, loaded, addXP, updateStreak, unlockBadge, updateMilestone, xpForNext, xpProgress };
}
