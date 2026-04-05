// ─── XP Engine ─────────────────────────────────────────────
// Decay-based XP system. Total XP is always recomputed from
// the full event history, with each event losing value over time.

export type XPCategory = "interaction" | "session" | "journal" | "social" | "challenge" | "mission";

export interface XPEvent {
  id: string;
  date: string;            // ISO date — used for decay calculation
  category: XPCategory;
  reason: string;
  amount: number;          // final amount stored (base × all modifiers at time of earn/update)
  sourceId?: string;       // interaction ID — allows pipeline replacement
  // Breakdown fields (only for pipeline-tracked interactions)
  base?: number;           // 30 for close
  pipelineCoef?: number;   // 1.2 → 3.0
  wingBonus?: number;      // 1.0 or 1.2
  streakCoef?: number;     // 1.0 → 2.0
}

// ─── Pipeline multipliers ──────────────────────────────────
export const PIPELINE_COEFS: Record<string, number> = {
  new: 1.2,
  contacted: 1.2,
  replied: 1.4,
  date_planned: 1.4,
  first_date: 1.7,
  second_date: 1.8,
  kissclose: 2.0,
  fuckclose: 3.0,
};

// Ordered for "highest achieved" lookup on archive
const PIPELINE_ORDER: string[] = [
  "new", "contacted", "replied", "date_planned",
  "first_date", "second_date", "kissclose", "fuckclose",
];

export function highestPipelineCoef(statusHistory: string[]): number {
  let best = 1.2;
  for (const s of statusHistory) {
    const c = PIPELINE_COEFS[s];
    if (c && c > best) best = c;
  }
  return best;
}

// ─── Base XP values ────────────────────────────────────────
export const XP = {
  // Interactions
  interaction_close: 30,     // × pipeline coef
  interaction_neutral: 20,   // flat
  interaction_rejection: 10, // flat

  // Sessions
  session_completed: 20,

  // Wing session bonus (multiplier on interaction XP)
  wing_session_bonus: 1.2,

  // Journal
  journal_entry: 8,
  journal_entry_long: 12,   // > 200 words

  // Social
  post_published: 10,
  comment_posted: 5,

  // Challenges (by target range)
  challenge_easy: 25,        // target 1-3
  challenge_medium: 50,      // target 4-7
  challenge_hard: 100,       // target 8-15
  challenge_extreme: 150,    // target 16+
  challenge_winner_bonus: 0.5, // +50% of base

  // Missions (by difficulty tier)
  mission_easy: 20,
  mission_medium: 50,
  mission_hard: 100,
  mission_epic: 200,
} as const;

// ─── Daily cap ─────────────────────────────────────────────
export const DAILY_INTERACTION_CAP = 300; // max interaction XP per day (before streak)

// ─── Streak ────────────────────────────────────────────────
export const STREAK_CAP = 2.0; // max multiplier (reached at day 11)

/** Streak coefficient for a given number of consecutive days */
export function streakCoef(days: number): number {
  if (days <= 1) return 1.0;
  return Math.min(1 + (days - 1) * 0.1, STREAK_CAP);
}

// ─── Decay ─────────────────────────────────────────────────
const MS_PER_MONTH = 30.44 * 24 * 3600 * 1000;

/** Compute effective (decayed) XP of a single event */
export function effectiveXP(event: XPEvent, now: Date = new Date()): number {
  const elapsed = now.getTime() - new Date(event.date).getTime();
  const months = elapsed / MS_PER_MONTH;
  if (months < 0) return event.amount; // future date edge case

  if (event.category === "interaction") {
    // Fast decay: halves every month
    return event.amount * Math.pow(0.5, months);
  }
  // Slow decay: halves every 3 months
  return event.amount * Math.pow(0.5, months / 3);
}

/** Total XP from all events with decay applied */
export function computeTotalXP(events: XPEvent[], now: Date = new Date()): number {
  let total = 0;
  for (const event of events) {
    const eff = effectiveXP(event, now);
    if (eff >= 0.5) total += eff;
  }
  return Math.floor(total);
}

// ─── Level curve: 50 × level^1.7 ──────────────────────────
/** Cumulative XP threshold to reach a given level */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.7));
}

/** Derive level from total XP */
export function levelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/** XP progress within current level (0-100) */
export function xpProgress(totalXP: number): number {
  const level = levelFromXP(totalXP);
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 0;
  return Math.min(((totalXP - currentThreshold) / range) * 100, 100);
}

// ─── Helpers ───────────────────────────────────────────────

/** Challenge XP based on target value */
export function challengeXP(target: number): number {
  if (target <= 3) return XP.challenge_easy;
  if (target <= 7) return XP.challenge_medium;
  if (target <= 15) return XP.challenge_hard;
  return XP.challenge_extreme;
}

/** Remove events that have decayed below 0.5 XP (cleanup) */
export function pruneEvents(events: XPEvent[], now: Date = new Date()): XPEvent[] {
  return events.filter((e) => effectiveXP(e, now) >= 0.5);
}

/**
 * Update pipeline XP for a source interaction.
 * Finds the event by sourceId and replaces its amount with the new pipeline coef.
 * Returns the updated events array.
 */
export function updatePipelineInEvents(
  events: XPEvent[],
  sourceInteractionId: string,
  newStatus: string,
): XPEvent[] {
  const coef = PIPELINE_COEFS[newStatus];
  if (!coef) return events;

  return events.map((e) => {
    if (e.sourceId !== sourceInteractionId || !e.base) return e;
    const newAmount = e.base * coef * (e.wingBonus ?? 1) * (e.streakCoef ?? 1);
    return { ...e, pipelineCoef: coef, amount: Math.round(newAmount * 10) / 10 };
  });
}
