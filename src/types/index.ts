// ─── Interaction ───────────────────────────────────────────
export type ApproachType = "direct" | "indirect" | "situational";
export type ResultType = "close" | "neutral" | "rejection";
export type DurationType = "short" | "medium" | "long";
export type ObjectionType = "in_relationship" | "not_interested" | "busy" | "too_young" | "too_old" | "other";

export interface Interaction {
  id: string;
  date: string;
  firstName: string;
  memorableElement: string;
  note: string;
  location: string;
  type: ApproachType;
  result: ResultType;
  duration: DurationType;
  feelingScore: number;
  womanScore: number;
  confidenceScore: number;
  objection: ObjectionType | null;
  objectionCustom: string;
  discussionTopics: string;
  feedback: string;
  contactMethod: ContactMethod | null;
  contactValue: string;
  sessionId: string;
  createdAt: string;
}

// ─── Contact / Pipeline ───────────────────────────────────
export type ContactStatus =
  | "new"
  | "contacted"
  | "replied"
  | "date_planned"
  | "first_date"
  | "second_date"
  | "kissclose"
  | "fuckclose"
  | "advanced"
  | "archived";

export type ArchiveReason = "no_interest" | "ghosted" | "taken" | "moved" | "other";

export interface ArchiveInfo {
  reason: ArchiveReason;
  customReason?: string;
  date: string;
}

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
  archiveInfo?: ArchiveInfo;
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
export type MissionTrackingType = "interactions" | "closes" | "sessions" | "dates" | "journal" | "contacts" | "custom";

export const MISSION_TRACKING_LABELS: Record<MissionTrackingType, string> = {
  interactions: "Interactions",
  closes: "Closes",
  sessions: "Sessions",
  dates: "Dates",
  journal: "Entrees journal",
  contacts: "Contacts",
  custom: "Personnalise",
};

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  trackingType: MissionTrackingType;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Journal ──────────────────────────────────────────────
export type JournalTag = "mindset" | "progress" | "fear" | "reflection" | "review" | "motivation";

export type Visibility = "private" | "wings" | "public";

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  tag: JournalTag | null;
  visibility: Visibility;
  createdAt: string;
}

// ─── Post ────────────────────────────────────────────────
export interface Post {
  id: string;
  userId: string;
  content: string;
  visibility: "wings" | "public";
  createdAt: string;
}

// ─── Session ──────────────────────────────────────────────
export interface Session {
  id: string;
  title: string;
  date: string;
  location: string;
  address: string;
  lat: number | null;
  lng: number | null;
  wings: string[];
  notes: string;
  goals: { text: string; done: boolean }[];
  interactionIds: string[];
  isPublic: boolean;
  maxParticipants: number;
  createdAt: string;
}

// ─── Session Social ──────────────────────────────────────
export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  ownerUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface SessionLike {
  id: string;
  sessionId: string;
  userId: string;
  createdAt: string;
}

export interface SessionComment {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  createdAt: string;
}

// ─── Wing ────────────────────────────────────────────────
export interface Wing {
  id: string;
  name: string;
  notes: string;
  sessionCount: number;
  createdAt: string;
}

// ─── Profile ──────────────────────────────────────────────
export interface UserProfile {
  name: string;
  gameObjectives: string;
  idealWoman: string;
  createdAt: string;
}

// ─── Public Profile (Social) ─────────────────────────────
export interface PrivacySettings {
  showInWingList: boolean;
  showInLeaderboardPublic: boolean;
  showInLeaderboardWings: boolean;
  shareReportsWithWings: boolean;
  shareStatsPublic: boolean;
  shareStatsWings: boolean;
  shareAgePublic: boolean;
  shareAgeWings: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  showInWingList: true,
  showInLeaderboardPublic: true,
  showInLeaderboardWings: true,
  shareReportsWithWings: false,
  shareStatsPublic: false,
  shareStatsWings: true,
  shareAgePublic: false,
  shareAgeWings: true,
};

export interface PublicProfile {
  userId: string;
  username: string;
  firstName: string;
  birthDate: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  bio: string;
  isPublic: boolean;
  privacy: PrivacySettings;
  createdAt: string;
}

// ─── Wing Request ────────────────────────────────────────
export type WingRequestStatus = "pending" | "accepted" | "declined";

export interface WingRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: WingRequestStatus;
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
  rejection: "bg-[#fb7185]/20 text-[#fb7185]",
};

export const TYPE_COLORS: Record<ApproachType, string> = {
  direct: "bg-[#c084fc]/15 text-[#c084fc]",
  indirect: "bg-[#818cf8]/15 text-[#818cf8]",
  situational: "bg-cyan-400/15 text-cyan-400",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  replied: "Repondu",
  date_planned: "Date planifie",
  first_date: "Premier date",
  second_date: "Second date",
  kissclose: "Kiss close",
  fuckclose: "Fuck close",
  advanced: "Avance",
  archived: "Archive",
};

export const STATUS_COLORS: Record<ContactStatus, string> = {
  new: "bg-[#c084fc]/15 text-[#c084fc]",
  contacted: "bg-amber-400/15 text-amber-400",
  replied: "bg-[#818cf8]/15 text-[#818cf8]",
  date_planned: "bg-cyan-400/15 text-cyan-400",
  first_date: "bg-emerald-400/15 text-emerald-400",
  second_date: "bg-emerald-500/15 text-emerald-300",
  kissclose: "bg-[#f472b6]/15 text-[#f472b6]",
  fuckclose: "bg-rose-500/15 text-rose-400",
  advanced: "bg-orange-400/15 text-orange-400",
  archived: "bg-[#a09bb2]/10 text-[#a09bb2]",
};

export const OBJECTION_LABELS: Record<ObjectionType, string> = {
  in_relationship: "En couple",
  not_interested: "Pas interessee",
  busy: "Pressee / pas le temps",
  too_young: "Trop jeune",
  too_old: "Trop vieux",
  other: "Autre",
};

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  no_interest: "Desinteret explicite",
  ghosted: "Aucune nouvelle",
  taken: "En couple entre temps",
  moved: "A demenage",
  other: "Autre",
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
  mindset: "bg-[#c084fc]/15 text-[#c084fc]",
  progress: "bg-emerald-400/15 text-emerald-400",
  fear: "bg-[#fb7185]/15 text-[#fb7185]",
  reflection: "bg-[#818cf8]/15 text-[#818cf8]",
  review: "bg-amber-400/15 text-amber-400",
  motivation: "bg-cyan-400/15 text-cyan-400",
};

// ─── Skill Rating ────────────────────────────────────────
export type SkillRank = "debutant" | "apprenti" | "intermediaire" | "confirme" | "avance" | "expert" | "maitre";

export const SKILL_RANK_LABELS: Record<SkillRank, string> = {
  debutant: "Debutant",
  apprenti: "Apprenti",
  intermediaire: "Intermediaire",
  confirme: "Confirme",
  avance: "Avance",
  expert: "Expert",
  maitre: "Maitre",
};

export const SKILL_RANK_COLORS: Record<SkillRank, string> = {
  debutant: "text-[#a09bb2]",
  apprenti: "text-[#c084fc]",
  intermediaire: "text-cyan-400",
  confirme: "text-[#818cf8]",
  avance: "text-amber-400",
  expert: "text-emerald-400",
  maitre: "text-[#f472b6]",
};

export const SKILL_RANK_THRESHOLDS: { rank: SkillRank; minScore: number }[] = [
  { rank: "maitre", minScore: 85 },
  { rank: "expert", minScore: 70 },
  { rank: "avance", minScore: 55 },
  { rank: "confirme", minScore: 40 },
  { rank: "intermediaire", minScore: 25 },
  { rank: "apprenti", minScore: 10 },
  { rank: "debutant", minScore: 0 },
];

/** Compute skill score (0-100) from interaction stats. Ratios matter more than volume. */
export function computeSkillScore(stats: {
  totalInteractions: number;
  closeRate: number;       // 0-1
  avgFeelingScore: number; // 1-10
  avgConfidence: number;   // 1-10
  streak: number;
}): number {
  // Close rate: 40% weight (most important)
  const closeScore = Math.min(stats.closeRate * 100, 100) * 0.40;
  // Quality of interactions (feeling): 20% weight
  const qualityScore = (stats.avgFeelingScore / 10) * 100 * 0.20;
  // Confidence (self-assessed): 15% weight
  const confidenceScore = (stats.avgConfidence / 10) * 100 * 0.15;
  // Volume (logarithmic, caps around 200): 15% weight
  const volumeScore = Math.min(Math.log10(Math.max(stats.totalInteractions, 1)) / Math.log10(200), 1) * 100 * 0.15;
  // Streak consistency: 10% weight
  const streakScore = Math.min(stats.streak / 30, 1) * 100 * 0.10;

  return Math.round(closeScore + qualityScore + confidenceScore + volumeScore + streakScore);
}

export function getSkillRank(score: number): SkillRank {
  for (const t of SKILL_RANK_THRESHOLDS) {
    if (score >= t.minScore) return t.rank;
  }
  return "debutant";
}

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
