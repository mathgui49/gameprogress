// ─── GameMax Premium Plan Configuration ─────────────────────────────
// Central source of truth for all free/premium limits and plan details

export const PLAN_NAME_FREE = "Gratuit";
export const PLAN_NAME_PRO = "GameMax";

export const PRICE_MONTHLY = 6.99;
export const PRICE_YEARLY = 49.99;
export const PRICE_MONTHLY_EQUIVALENT = +(PRICE_YEARLY / 12).toFixed(2); // 4.17
export const YEARLY_DISCOUNT_PERCENT = Math.round((1 - PRICE_YEARLY / (PRICE_MONTHLY * 12)) * 100); // 40

export const REFERRAL_PRO_DAYS = 7; // Days of free Pro for both referrer and referee

export const AMBASSADOR_COMMISSION_PERCENT = 30;

// ─── Free Plan Limits ────────────────────────────────────
export const FREE_LIMITS = {
  interactionsPerMonth: 15,
  activeContacts: 5,
  journalEntriesPerMonth: 3,
  sessionsPerMonth: 2,
  maxWings: 3,
  missionsTypes: ["daily"] as const, // only daily missions
  maxBadges: 5,
  analyticsWeeks: 1, // current week only
  aiCoaching: false,
  exportPdf: false,
  calendarViews: ["month"] as const,
  leaderboardFull: false,
  profileComparison: false,
  wingChallenges: false,
  wingPings: false,
  wingDiscovery: false,
  journalCollections: false,
  journalCollaborative: false,
  journalSharing: false,
  customMissions: false,
  weeklyMissions: false,
  advancedReminders: false,
  sessionMap: false,
  heatmap: false,
};

// ─── Helpers to check limits ─────────────────────────────

export function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function countThisMonth<T extends { createdAt: string }>(items: T[]): number {
  const start = getMonthStart();
  return items.filter((i) => i.createdAt >= start).length;
}

export function isAtLimit(currentCount: number, limit: number): boolean {
  return currentCount >= limit;
}

export function remainingQuota(currentCount: number, limit: number): number {
  return Math.max(0, limit - currentCount);
}

// ─── Feature flags by plan ───────────────────────────────

export interface PlanFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  category: "tracking" | "social" | "analytics" | "gamification" | "tools";
}

export const PLAN_FEATURES: PlanFeature[] = [
  // Tracking
  { name: "Interactions par mois", free: "15", pro: "Illimitées", category: "tracking" },
  { name: "Contacts actifs (Pipeline)", free: "5", pro: "Illimités", category: "tracking" },
  { name: "Entrées journal par mois", free: "3", pro: "Illimitées", category: "tracking" },
  { name: "Sessions par mois", free: "2", pro: "Illimitées", category: "tracking" },
  { name: "Collections & journal collaboratif", free: false, pro: true, category: "tracking" },
  { name: "Partage de journal", free: false, pro: true, category: "tracking" },

  // Social
  { name: "Wings", free: "3 max", pro: "Illimités", category: "social" },
  { name: "Messages", free: true, pro: true, category: "social" },
  { name: "Feed communautaire", free: true, pro: true, category: "social" },
  { name: "Challenges entre wings", free: false, pro: true, category: "social" },
  { name: "Wing Pings (localisation)", free: false, pro: true, category: "social" },
  { name: "Découverte de wings", free: false, pro: true, category: "social" },
  { name: "Classement complet", free: "Top 3 seulement", pro: "Complet + comparaison", category: "social" },

  // Analytics
  { name: "Statistiques", free: "Semaine en cours", pro: "Historique illimité", category: "analytics" },
  { name: "Heatmap d'activité", free: false, pro: true, category: "analytics" },
  { name: "Export PDF des rapports", free: false, pro: true, category: "analytics" },
  { name: "Coaching IA personnalisé", free: false, pro: true, category: "analytics" },

  // Gamification
  { name: "XP, niveaux et streaks", free: true, pro: true, category: "gamification" },
  { name: "Badges débloquables", free: "5 premiers", pro: "Tous les badges", category: "gamification" },
  { name: "Rang de compétence complet", free: false, pro: true, category: "gamification" },
  { name: "Missions daily", free: true, pro: true, category: "gamification" },
  { name: "Missions weekly & custom", free: false, pro: true, category: "gamification" },

  // Tools
  { name: "Calendrier", free: "Vue mois", pro: "Toutes les vues", category: "tools" },
  { name: "Rappels avancés (contacts)", free: false, pro: true, category: "tools" },
  { name: "Carte des sessions", free: false, pro: true, category: "tools" },
  { name: "Notifications push", free: true, pro: true, category: "tools" },
];
