// ─── Interaction ───────────────────────────────────────────
export type ApproachType = "direct" | "indirect" | "situational";
export type ResultType = "close" | "neutral" | "rejection";
export type DurationType = "short" | "medium" | "long";

export interface Interaction {
  id: string;
  date: string;
  firstName: string;
  note: string;
  location: string;
  type: ApproachType;
  result: ResultType;
  duration: DurationType;
  feelingScore: number;
  createdAt: string;
}

// ─── Contact / Pipeline ───────────────────────────────────
export type ContactStatus =
  | "new"
  | "contacted"
  | "replied"
  | "date_planned"
  | "date_done"
  | "advanced"
  | "archived";

export type ContactMethod = "phone" | "instagram" | "other";

export interface Reminder {
  id: string;
  contactId: string;
  label: string;
  date: string;
  done: boolean;
}

export interface ContactEvent {
  id: string;
  type: "status_change" | "note" | "interaction" | "reminder";
  date: string;
  content: string;
  meta?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  sourceInteractionId: string;
  method: ContactMethod;
  methodValue: string;
  status: ContactStatus;
  tags: string[];
  notes: string;
  timeline: ContactEvent[];
  reminders: Reminder[];
  createdAt: string;
  lastInteractionDate: string;
}

// ─── Gamification ─────────────────────────────────────────
export interface XPEvent {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  unlockedAt: string | null;
}

export interface Milestone {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
  unlockedAt: string | null;
}

export interface GamificationState {
  xp: number;
  level: number;
  xpEvents: XPEvent[];
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
  badges: Badge[];
  milestones: Milestone[];
}

// ─── Mission ──────────────────────────────────────────────
export type MissionType = "daily" | "weekly" | "custom";

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

// ─── Journal ──────────────────────────────────────────────
export type JournalTag = "mindset" | "progress" | "fear" | "reflection" | "review" | "motivation";

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  tag: JournalTag | null;
  createdAt: string;
}

// ─── Profile ──────────────────────────────────────────────
export interface UserProfile {
  name: string;
  createdAt: string;
}

// ─── Labels & Colors ──────────────────────────────────────
export const APPROACH_LABELS: Record<ApproachType, string> = {
  direct: "Direct",
  indirect: "Indirect",
  situational: "Situationnel",
};

export const RESULT_LABELS: Record<ResultType, string> = {
  close: "Close",
  neutral: "Neutre",
  rejection: "Rejet",
};

export const DURATION_LABELS: Record<DurationType, string> = {
  short: "Court (<2 min)",
  medium: "Moyen (2-5 min)",
  long: "Long (5+ min)",
};

export const RESULT_COLORS: Record<ResultType, string> = {
  close: "bg-emerald-500/20 text-emerald-400",
  neutral: "bg-amber-500/20 text-amber-400",
  rejection: "bg-[#ff6e84]/20 text-[#ff6e84]",
};

export const TYPE_COLORS: Record<ApproachType, string> = {
  direct: "bg-[#85adff]/15 text-[#85adff]",
  indirect: "bg-[#ac8aff]/15 text-[#ac8aff]",
  situational: "bg-cyan-400/15 text-cyan-400",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  replied: "Repondu",
  date_planned: "Date planifie",
  date_done: "Date effectue",
  advanced: "Avance",
  archived: "Archive",
};

export const STATUS_COLORS: Record<ContactStatus, string> = {
  new: "bg-[#85adff]/15 text-[#85adff]",
  contacted: "bg-amber-400/15 text-amber-400",
  replied: "bg-[#ac8aff]/15 text-[#ac8aff]",
  date_planned: "bg-cyan-400/15 text-cyan-400",
  date_done: "bg-emerald-400/15 text-emerald-400",
  advanced: "bg-pink-400/15 text-pink-400",
  archived: "bg-[#adaaab]/10 text-[#adaaab]",
};

export const JOURNAL_TAG_LABELS: Record<JournalTag, string> = {
  mindset: "Mindset",
  progress: "Progres",
  fear: "Peur",
  reflection: "Reflexion",
  review: "Bilan",
  motivation: "Motivation",
};

export const JOURNAL_TAG_COLORS: Record<JournalTag, string> = {
  mindset: "bg-[#85adff]/15 text-[#85adff]",
  progress: "bg-emerald-400/15 text-emerald-400",
  fear: "bg-[#ff6e84]/15 text-[#ff6e84]",
  reflection: "bg-[#ac8aff]/15 text-[#ac8aff]",
  review: "bg-amber-400/15 text-amber-400",
  motivation: "bg-cyan-400/15 text-cyan-400",
};

// ─── XP config ────────────────────────────────────────────
export const XP_VALUES = {
  interaction_created: 10,
  interaction_with_note: 5,
  close: 25,
  contact_added: 15,
  mission_completed: 30,
  streak_bonus: 10,
  journal_entry: 5,
} as const;

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}
