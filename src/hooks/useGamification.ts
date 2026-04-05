"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { GamificationState } from "@/types";
import type { XPEvent, XPCategory } from "@/lib/xp";
import {
  XP, DAILY_INTERACTION_CAP, streakCoef,
  computeTotalXP, levelFromXP, xpForLevel, xpProgress as calcXpProgress,
  updatePipelineInEvents, pruneEvents, PIPELINE_COEFS,
} from "@/lib/xp";
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
    [userId],
  );

  // ─── Computed XP & Level (live, with decay) ──────────────
  const totalXP = useMemo(() => computeTotalXP(state.xpEvents), [state.xpEvents]);
  const level = useMemo(() => levelFromXP(totalXP), [totalXP]);
  const xpForNext = useMemo(() => xpForLevel(level + 1), [level]);
  const xpCurrent = useMemo(() => xpForLevel(level), [level]);
  const xpProgressPct = useMemo(() => calcXpProgress(totalXP), [totalXP]);

  // ─── Daily tracking helpers ──────────────────────────────
  const today = () => new Date().toISOString().split("T")[0];

  const getDailyInteractionXp = useCallback((s: GamificationState): number => {
    return s.dailyDate === today() ? s.dailyInteractionXp : 0;
  }, []);

  // ─── Streak ──────────────────────────────────────────────
  const updateStreak = useCallback(() => {
    const current = stateRef.current;
    const t = today();
    if (current.lastActiveDate === t) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = current.lastActiveDate === yesterday ? current.streak + 1 : 1;
    const newLevel = levelFromXP(computeTotalXP(current.xpEvents));
    persist({
      ...current,
      streak: newStreak,
      bestStreak: Math.max(newStreak, current.bestStreak),
      bestLevel: Math.max(newLevel, current.bestLevel),
      lastActiveDate: t,
    });
  }, [persist]);

  // ─── Add interaction XP ──────────────────────────────────
  // Called when logging a new interaction.
  // result: "close" | "neutral" | "rejection"
  // sourceId: interaction ID (for pipeline tracking if close)
  // hasWing: true if session has wing(s) → +20% bonus
  const addInteractionXP = useCallback(
    (result: "close" | "neutral" | "rejection", sourceId: string, hasWing = false) => {
      const current = stateRef.current;
      const t = today();
      const dailySoFar = current.dailyDate === t ? current.dailyInteractionXp : 0;

      let baseAmount: number;
      let reason: string;

      if (result === "close") {
        baseAmount = XP.interaction_close; // 30, will be × pipeline coef
        reason = "Close";
      } else if (result === "neutral") {
        baseAmount = XP.interaction_neutral;
        reason = "Interaction neutre";
      } else {
        baseAmount = XP.interaction_rejection;
        reason = "Rejet affronté";
      }

      // For close: apply initial pipeline coef (new = 1.2)
      const pipelineCoef = result === "close" ? PIPELINE_COEFS.new : undefined;
      const wingBonus = hasWing ? XP.wing_session_bonus : 1;
      const sCoef = streakCoef(current.streak);

      // Raw amount (before streak for cap check)
      const rawAmount = result === "close"
        ? baseAmount * (pipelineCoef ?? 1) * wingBonus
        : baseAmount * wingBonus;

      // Check daily cap (on raw, before streak)
      if (dailySoFar >= DAILY_INTERACTION_CAP) return; // capped
      const cappedRaw = Math.min(rawAmount, DAILY_INTERACTION_CAP - dailySoFar);

      // Final amount = capped raw × streak coef (streak only on interactions)
      const finalAmount = Math.round(cappedRaw * sCoef * 10) / 10;

      // Adjust base proportionally if capped
      const ratio = cappedRaw / rawAmount;
      const adjustedBase = result === "close" ? baseAmount * ratio : undefined;

      const event: XPEvent = {
        id: generateId(),
        date: new Date().toISOString(),
        category: "interaction" as const,
        reason,
        amount: finalAmount,
        sourceId,
        ...(result === "close" && {
          base: adjustedBase,
          pipelineCoef,
          wingBonus,
          streakCoef: sCoef,
        }),
      };

      const events = [event, ...current.xpEvents];
      const newLevel = levelFromXP(computeTotalXP(events));

      persist({
        ...current,
        xpEvents: events,
        bestLevel: Math.max(newLevel, current.bestLevel),
        dailyInteractionXp: dailySoFar + cappedRaw,
        dailyDate: t,
      });
    },
    [persist],
  );

  // ─── Update pipeline XP (replacement) ───────────────────
  // Called when a contact's pipeline status changes.
  // Finds the XP event by sourceInteractionId and replaces
  // the amount with the new pipeline coefficient.
  const updatePipelineXP = useCallback(
    (sourceInteractionId: string, newStatus: string) => {
      const current = stateRef.current;
      const updatedEvents = updatePipelineInEvents(current.xpEvents, sourceInteractionId, newStatus);
      if (updatedEvents === current.xpEvents) return; // no change

      const newLevel = levelFromXP(computeTotalXP(updatedEvents));
      persist({
        ...current,
        xpEvents: updatedEvents,
        bestLevel: Math.max(newLevel, current.bestLevel),
      });
    },
    [persist],
  );

  // ─── Add generic XP (non-interaction) ────────────────────
  // For journal, session, social, challenge, mission
  const addXP = useCallback(
    (amount: number, reason: string, category: XPCategory) => {
      const current = stateRef.current;
      const event: XPEvent = {
        id: generateId(),
        date: new Date().toISOString(),
        category,
        reason,
        amount,
      };

      const events = [event, ...current.xpEvents];
      const newLevel = levelFromXP(computeTotalXP(events));

      persist({
        ...current,
        xpEvents: events,
        bestLevel: Math.max(newLevel, current.bestLevel),
      });
    },
    [persist],
  );

  // ─── Badges & Milestones (unchanged logic) ───────────────
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
    [persist],
  );

  const updateMilestone = useCallback(
    (milestoneId: string, currentVal: number) => {
      const s = stateRef.current;
      persist({
        ...s,
        milestones: s.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const unlocked = currentVal >= m.target && !m.unlockedAt;
          return { ...m, current: currentVal, unlockedAt: unlocked ? new Date().toISOString() : m.unlockedAt };
        }),
      });
    },
    [persist],
  );

  // ─── Periodic cleanup (prune decayed events) ─────────────
  useEffect(() => {
    if (!loaded || state.xpEvents.length === 0) return;
    const pruned = pruneEvents(state.xpEvents);
    if (pruned.length < state.xpEvents.length) {
      persist({ ...state, xpEvents: pruned });
    }
  }, [loaded]); // only on mount

  return {
    // State
    xpEvents: state.xpEvents,
    streak: state.streak,
    bestStreak: state.bestStreak,
    bestLevel: state.bestLevel,
    lastActiveDate: state.lastActiveDate,
    badges: state.badges,
    milestones: state.milestones,
    loaded,
    // Computed
    xp: totalXP,
    level,
    xpForNext,
    xpCurrent,
    xpProgress: xpProgressPct,
    // Actions
    addInteractionXP,
    updatePipelineXP,
    addXP,
    updateStreak,
    unlockBadge,
    updateMilestone,
  };
}
