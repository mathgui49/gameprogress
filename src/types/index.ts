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
  tags: string[];
  contextPhoto: string | null;
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
// XPEvent is defined in @/lib/xp — re-exported here for convenience
export type { XPEvent, XPCategory } from "@/lib/xp";

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

export interface BadgeTier {
  threshold: number;
  name: string;
  icon: string;
  description?: string;
}

export interface BadgeCategory {
  id: string;
  label: string;
  key: string;
  description?: string;
  tiers: BadgeTier[];
}

export interface GamificationState {
  xpEvents: import("@/lib/xp").XPEvent[];
  streak: number;
  bestStreak: number;
  bestLevel: number;
  lastActiveDate: string;
  dailyInteractionXp: number; // raw interaction XP earned today (before streak), for cap
  dailyDate: string;          // YYYY-MM-DD of current day tracking
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
  journal: "Posts journal",
  contacts: "Contacts",
  custom: "Personnalisé",
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

export type JournalEntryType = "entry" | "fieldreport";

export interface JournalAttachment {
  type: "image" | "file";
  url: string;
  name: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  tag: JournalTag | null;
  visibility: Visibility;
  entryType: JournalEntryType;
  sessionId: string | null;
  attachments: JournalAttachment[];
  linkedInteractionIds: string[];
  collectionId: string | null;
  isCollaborative: boolean;
  createdAt: string;
}

// ─── Post ────────────────────────────────────────────────
export type PostType = "text" | "photo" | "session_share" | "field_report" | "milestone" | "badge";
export type ReactionType = "fire" | "bravo" | "crown" | "force" | "respect";

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  fire: "\ud83d\udd25",
  bravo: "\ud83d\udc4f",
  crown: "\ud83d\udc51",
  force: "\ud83d\udcaa",
  respect: "\ud83e\udd1d",
};

export interface Post {
  id: string;
  userId: string;
  content: string;
  visibility: "wings" | "public";
  postType: PostType;
  images: string[];
  hashtags: string[];
  mentions: string[];
  linkedSessionId: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface PostReaction {
  id: string;
  postId: string;
  userId: string;
  reaction: ReactionType;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface PostReport {
  id: string;
  postId: string;
  userId: string;
  reason: string;
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
  estimatedDuration: number | null; // in minutes
  endedAt: string | null;
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
  shareLocationPublic: boolean;
  shareLocationWings: boolean;
  showInDiscover: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  showInWingList: true,
  showInLeaderboardPublic: true,
  showInLeaderboardWings: true,
  shareReportsWithWings: false,
  shareStatsPublic: true,
  shareStatsWings: true,
  shareAgePublic: true,
  shareAgeWings: true,
  shareLocationPublic: true,
  shareLocationWings: true,
  showInDiscover: true,
};

export interface PublicProfile {
  userId: string;
  username: string;
  firstName: string;
  birthDate: string | null;
  profilePhoto: string | null;
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
  direct: "bg-[var(--primary)]/15 text-[var(--primary)]",
  indirect: "bg-[var(--tertiary)]/15 text-[var(--tertiary)]",
  situational: "bg-cyan-400/15 text-cyan-400",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Close",
  contacted: "Contactée",
  replied: "Répondu",
  date_planned: "Date planifié",
  first_date: "Premier date",
  second_date: "Second date",
  kissclose: "Kiss close",
  fuckclose: "Fuck close",
  advanced: "Avancé",
  archived: "Archivé",
};

export const STATUS_COLORS: Record<ContactStatus, string> = {
  new: "bg-[var(--primary)]/15 text-[var(--primary)]",
  contacted: "bg-amber-400/15 text-amber-400",
  replied: "bg-[var(--tertiary)]/15 text-[var(--tertiary)]",
  date_planned: "bg-cyan-400/15 text-cyan-400",
  first_date: "bg-emerald-400/15 text-emerald-400",
  second_date: "bg-emerald-500/15 text-emerald-300",
  kissclose: "bg-[#f472b6]/15 text-[var(--secondary)]",
  fuckclose: "bg-rose-500/15 text-rose-400",
  advanced: "bg-orange-400/15 text-orange-400",
  archived: "bg-[#a09bb2]/10 text-[var(--on-surface-variant)]",
};

export const OBJECTION_LABELS: Record<ObjectionType, string> = {
  in_relationship: "En couple",
  not_interested: "Pas intéressée",
  busy: "Pressée / pas le temps",
  too_young: "Trop jeune",
  too_old: "Trop vieux",
  other: "Autre",
};

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  no_interest: "Désintérêt explicite",
  ghosted: "Aucune nouvelle",
  taken: "En couple entre temps",
  moved: "A déménagé",
  other: "Autre",
};

export const JOURNAL_TAG_LABELS: Record<JournalTag, string> = {
  mindset: "Mindset",
  progress: "Progrès",
  fear: "Peur",
  reflection: "Réflexion",
  review: "Bilan",
  motivation: "Motivation",
};

export const JOURNAL_TAG_COLORS: Record<JournalTag, string> = {
  mindset: "bg-[var(--primary)]/15 text-[var(--primary)]",
  progress: "bg-emerald-400/15 text-emerald-400",
  fear: "bg-[#fb7185]/15 text-[#fb7185]",
  reflection: "bg-[var(--tertiary)]/15 text-[var(--tertiary)]",
  review: "bg-amber-400/15 text-amber-400",
  motivation: "bg-cyan-400/15 text-cyan-400",
};

// ─── Skill Rating ────────────────────────────────────────
export type SkillRank = "debutant" | "apprenti" | "intermediaire" | "confirme" | "avance" | "expert" | "maitre";

export const SKILL_RANK_LABELS: Record<SkillRank, string> = {
  debutant: "Débutant",
  apprenti: "Apprenti",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
  avance: "Avancé",
  expert: "Expert",
  maitre: "Maître",
};

export const SKILL_RANK_COLORS: Record<SkillRank, string> = {
  debutant: "text-[var(--on-surface-variant)]",
  apprenti: "text-[var(--primary)]",
  intermediaire: "text-cyan-400",
  confirme: "text-[var(--tertiary)]",
  avance: "text-[var(--tertiary)]",
  expert: "text-emerald-400",
  maitre: "text-[var(--secondary)]",
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
  streak: number;
}): number {
  // Close rate: 45% weight (most important)
  const closeScore = Math.min(stats.closeRate * 100, 100) * 0.45;
  // Quality of interactions (feeling): 25% weight
  const qualityScore = (stats.avgFeelingScore / 10) * 100 * 0.25;
  // Volume (logarithmic, caps around 200): 18% weight
  const volumeScore = Math.min(Math.log10(Math.max(stats.totalInteractions, 1)) / Math.log10(200), 1) * 100 * 0.18;
  // Streak consistency: 12% weight
  const streakScore = Math.min(stats.streak / 30, 1) * 100 * 0.12;

  return Math.round(closeScore + qualityScore + volumeScore + streakScore);
}

export function getSkillRank(score: number): SkillRank {
  for (const t of SKILL_RANK_THRESHOLDS) {
    if (score >= t.minScore) return t.rank;
  }
  return "debutant";
}

// ─── Messages / Chat ────────────────────────────────────
export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  groupId: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessageGroup {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  createdAt: string;
}

// ─── Wing Status ────────────────────────────────────────
export type WingStatus = "available" | "in_session" | "busy" | "offline";

export const WING_STATUS_LABELS: Record<WingStatus, string> = {
  available: "Disponible",
  in_session: "En session",
  busy: "Occupé",
  offline: "Hors ligne",
};

export const WING_STATUS_COLORS: Record<WingStatus, string> = {
  available: "bg-emerald-400",
  in_session: "bg-[var(--primary)]",
  busy: "bg-amber-400",
  offline: "bg-[var(--outline-variant)]",
};

// ─── Wing Notes & Categories ────────────────────────────
export type WingCategory = "favorite" | "regular" | "occasional";

export const WING_CATEGORY_LABELS: Record<WingCategory, string> = {
  favorite: "Favori",
  regular: "Régulier",
  occasional: "Occasionnel",
};

export const WING_CATEGORY_COLORS: Record<WingCategory, string> = {
  favorite: "bg-amber-400/15 text-amber-400",
  regular: "bg-[var(--primary)]/15 text-[var(--primary)]",
  occasional: "bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]",
};

export interface WingNote {
  id: string;
  wingUserId: string;
  content: string;
  createdAt: string;
}

export interface WingMeta {
  wingUserId: string;
  category: WingCategory | null;
  notes: WingNote[];
  sharedSessionStreak: number;
  bestSharedStreak: number;
  lastSharedSessionDate: string | null;
}

// ─── Wing Challenges ────────────────────────────────────
export type ChallengeStatus = "active" | "completed" | "expired";

export interface WingChallenge {
  id: string;
  createdBy: string;
  targetUserId: string;
  title: string;
  description: string;
  target: number;
  currentCreator: number;
  currentTarget: number;
  metric: "approaches" | "closes" | "sessions" | "custom";
  deadline: string;
  status: ChallengeStatus;
  winnerId: string | null;
  createdAt: string;
}

// ─── Wing Ping ──────────────────────────────────────────
export interface WingPing {
  id: string;
  fromUserId: string;
  message: string;
  location: string;
  date: string;
  createdAt: string;
  respondedIds: string[];
}

// ─── Journal Extensions ─────────────────────────────────
export interface JournalCollection {
  id: string;
  name: string;
  description: string;
  entryIds: string[];
  createdAt: string;
}

export interface JournalDraft {
  id: string;
  content: string;
  tag: JournalTag | null;
  visibility: Visibility;
  linkedInteractionIds: string[];
  collectionId: string | null;
  lastSavedAt: string;
}

export interface JournalShareLink {
  id: string;
  entryId: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CollaborativeEntry {
  id: string;
  journalEntryId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// ─── XP config ────────────────────────────────────────────
// All XP constants, level curve, and computation live in @/lib/xp
export { XP, PIPELINE_COEFS, xpForLevel, levelFromXP, xpProgress, streakCoef, computeTotalXP, challengeXP, DAILY_INTERACTION_CAP } from "@/lib/xp";
