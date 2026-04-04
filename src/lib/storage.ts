const IS_BROWSER = typeof window !== "undefined";

export function getItem<T>(key: string, fallback: T): T {
  if (!IS_BROWSER) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (!IS_BROWSER) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`Failed to save ${key} to localStorage`);
  }
}

export function removeItem(key: string): void {
  if (!IS_BROWSER) return;
  localStorage.removeItem(key);
}

export function clearAll(): void {
  if (!IS_BROWSER) return;
  const keys = Object.values(STORAGE_KEYS);
  keys.forEach((k) => localStorage.removeItem(k));
}

export const STORAGE_KEYS = {
  INTERACTIONS: "gp_interactions",
  CONTACTS: "gp_contacts",
  GAMIFICATION: "gp_gamification",
  MISSIONS: "gp_missions",
  JOURNAL: "gp_journal",
  PROFILE: "gp_profile",
  SETTINGS: "gp_settings",
  SEEDED: "gp_seeded",
} as const;
