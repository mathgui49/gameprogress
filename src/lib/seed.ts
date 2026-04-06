import type { Interaction, Contact, Mission, JournalEntry, GamificationState, Badge, Milestone, BadgeCategory } from "@/types";
import { generateId } from "./utils";

const DEFAULTS = { memorableElement: "", womanScore: 7, confidenceScore: 5, objection: null, objectionCustom: "", discussionTopics: "", feedback: "", contactMethod: null, contactValue: "", sessionId: "", tags: [] as string[], contextPhoto: null } as const;

export function generateSeedInteractions(): Interaction[] {
  const now = new Date();
  const items: Omit<Interaction, "id" | "createdAt">[] = [
    { ...DEFAULTS, date: new Date(now.getTime() - 1 * 3600000).toISOString(), firstName: "Sophie", memorableElement: "Revenait du Japon", note: "Rencontre au café, conversation naturelle sur les voyages.", location: "Café Flore, Paris 6e", type: "direct", result: "close", duration: "long", feelingScore: 9, womanScore: 9, confidenceScore: 8, discussionTopics: "Voyages, Japon, cuisine asiatique", feedback: "Bonne ouverture, conversation fluide. Bien géré la transition vers le numéro.", contactMethod: "instagram", contactValue: "@sophie" },
    { ...DEFAULTS, date: new Date(now.getTime() - 5 * 3600000).toISOString(), firstName: "Emma", memorableElement: "Cherchait Murakami", note: "Approche en librairie, elle cherchait Murakami. Échange sympa mais pressée.", location: "Librairie Gibert, Paris 5e", type: "situational", result: "neutral", duration: "medium", feelingScore: 7, womanScore: 7, confidenceScore: 3, feedback: "Bon opener situationnel mais j'aurais dû être plus direct sur l'intention." },
    { ...DEFAULTS, date: new Date(now.getTime() - 24 * 3600000).toISOString(), firstName: "Clara", note: "Directe dans la rue, bonne énergie. Échange de numéros.", location: "Rue de Rivoli", type: "direct", result: "close", duration: "medium", feelingScore: 8, womanScore: 8, confidenceScore: 7, contactMethod: "phone", contactValue: "06 XX XX XX XX" },
    { ...DEFAULTS, date: new Date(now.getTime() - 26 * 3600000).toISOString(), firstName: "", memorableElement: "Fille au parc, robe jaune", note: "Approche au parc, en couple finalement.", location: "Jardin du Luxembourg", type: "direct", result: "rejection", duration: "short", feelingScore: 5, womanScore: 8, confidenceScore: 1, objection: "in_relationship" },
    { ...DEFAULTS, date: new Date(now.getTime() - 48 * 3600000).toISOString(), firstName: "Léa", note: "Rencontre en soirée chez des amis. Très bon feeling, longue conversation.", location: "Soirée privée, Paris 11e", type: "indirect", result: "close", duration: "long", feelingScore: 9, womanScore: 9, confidenceScore: 9, discussionTopics: "Musique, films d'auteur, philosophie", contactMethod: "instagram", contactValue: "@lea" },
    { ...DEFAULTS, date: new Date(now.getTime() - 72 * 3600000).toISOString(), firstName: "Camille", note: "Approche directe, elle attendait le métro. Rapide mais bien exécuté.", location: "Métro Châtelet", type: "direct", result: "neutral", duration: "short", feelingScore: 6, womanScore: 6, confidenceScore: 2, objection: "busy" },
    { ...DEFAULTS, date: new Date(now.getTime() - 96 * 3600000).toISOString(), firstName: "Julie", memorableElement: "Tatouage lune sur le poignet", note: "Discussion spontanée à la salle de sport.", location: "Basic Fit, Paris 3e", type: "situational", result: "close", duration: "long", feelingScore: 8, womanScore: 8, confidenceScore: 7, discussionTopics: "Sport, nutrition, course à pied", contactMethod: "phone", contactValue: "06 XX XX XX XX" },
    { ...DEFAULTS, date: new Date(now.getTime() - 120 * 3600000).toISOString(), firstName: "", memorableElement: "Blonde, écouteurs roses", note: "Approche dans le train, pas le bon moment.", location: "TGV Paris-Lyon", type: "direct", result: "rejection", duration: "short", feelingScore: 4, womanScore: 7, confidenceScore: 1, objection: "not_interested", feedback: "Mauvais timing, elle travaillait. Apprendre à mieux lire le contexte." },
    { ...DEFAULTS, date: new Date(now.getTime() - 144 * 3600000).toISOString(), firstName: "Alice", note: "Rencontre au vernissage. Échange Instagram.", location: "Galerie Perrotin, Paris 3e", type: "indirect", result: "close", duration: "medium", feelingScore: 7, womanScore: 7, confidenceScore: 6, contactMethod: "instagram", contactValue: "@alice" },
    { ...DEFAULTS, date: new Date(now.getTime() - 168 * 3600000).toISOString(), firstName: "Ines", note: "Approche en terrasse, conversation sur la musique.", location: "Terrasse, Oberkampf", type: "situational", result: "neutral", duration: "medium", feelingScore: 6, womanScore: 6, confidenceScore: 3 },
  ];
  return items.map((i) => ({ ...i, id: generateId(), createdAt: i.date }));
}

export function generateSeedContacts(interactions: Interaction[]): Contact[] {
  const closes = interactions.filter((i) => i.result === "close" && i.firstName);
  return closes.slice(0, 4).map((i, idx) => {
    const statuses: Array<"new" | "contacted" | "replied" | "date_planned"> = ["date_planned", "replied", "contacted", "new"];
    return {
      id: generateId(),
      firstName: i.firstName,
      sourceInteractionId: i.id,
      method: idx % 2 === 0 ? "instagram" as const : "phone" as const,
      methodValue: idx % 2 === 0 ? `@${i.firstName.toLowerCase()}` : "06 XX XX XX XX",
      status: statuses[idx],
      tags: [["high interest", "fun"], ["bon feeling"], ["a relancer"], ["reservee"]][idx],
      notes: "",
      timeline: [{ id: generateId(), type: "interaction" as const, date: i.date, content: `Interaction initiale - ${i.location}` }],
      reminders: idx === 0 ? [{ id: generateId(), contactId: "", label: "Confirmer le date", date: new Date(Date.now() + 86400000).toISOString(), done: false }] : [],
      createdAt: i.createdAt,
      lastInteractionDate: i.date,
    };
  });
}

export function generateSeedMissions(): Mission[] {
  return [
    { id: generateId(), title: "3 interactions aujourd'hui", description: "Fais 3 interactions dans la journée", type: "daily", trackingType: "interactions", target: 3, current: 0, xpReward: 30, completed: false, deadline: null, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "1 close cette semaine", description: "Obtiens au moins un close", type: "weekly", trackingType: "closes", target: 1, current: 0, xpReward: 25, completed: false, deadline: null, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "Écrire dans le journal", description: "Fais une entrée dans ton journal", type: "daily", trackingType: "journal", target: 1, current: 0, xpReward: 15, completed: false, deadline: null, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "10 interactions cette semaine", description: "Objectif hebdomadaire", type: "weekly", trackingType: "interactions", target: 10, current: 0, xpReward: 50, completed: false, deadline: null, createdAt: new Date().toISOString(), completedAt: null },
  ];
}

export function generateSeedJournal(): JournalEntry[] {
  const now = new Date();
  return [
    { id: generateId(), date: new Date(now.getTime() - 24 * 3600000).toISOString(), content: "Bonne journée aujourd'hui. J'ai réussi à faire 3 approches dont une directe qui s'est super bien passée. Je sens que je progresse sur la confiance.", tag: "progress", visibility: "private", entryType: "entry", sessionId: null, attachments: [], linkedInteractionIds: [], collectionId: null, isCollaborative: false, createdAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: generateId(), date: new Date(now.getTime() - 72 * 3600000).toISOString(), content: "Grosse peur avant de sortir aujourd'hui. J'ai quand même fait 2 approches. La première était maladroite mais la deuxième beaucoup mieux.", tag: "fear", visibility: "private", entryType: "entry", sessionId: null, attachments: [], linkedInteractionIds: [], collectionId: null, isCollaborative: false, createdAt: new Date(now.getTime() - 72 * 3600000).toISOString() },
    { id: generateId(), date: new Date(now.getTime() - 168 * 3600000).toISOString(), content: "Bilan de la semaine : 8 interactions, 3 closes. Je suis content de ma régularité. Il faut que je travaille sur la durée des conversations.", tag: "review", visibility: "private", entryType: "entry", sessionId: null, attachments: [], linkedInteractionIds: [], collectionId: null, isCollaborative: false, createdAt: new Date(now.getTime() - 168 * 3600000).toISOString() },
  ];
}

export function generateDefaultBadges(): Badge[] {
  return [
    // Interactions
    { id: "b1", name: "Première interaction", description: "A réalisé sa première interaction", icon: "target", condition: "interactions >= 1", unlockedAt: null },
    { id: "b2", name: "10 interactions", description: "A atteint 10 interactions", icon: "flame", condition: "interactions >= 10", unlockedAt: null },
    { id: "b7", name: "50 interactions", description: "A atteint 50 interactions", icon: "trophy", condition: "interactions >= 50", unlockedAt: null },
    // Closes
    { id: "b3", name: "Premier close", description: "A obtenu son premier close", icon: "sparkle", condition: "closes >= 1", unlockedAt: null },
    { id: "b4", name: "5 closes", description: "A obtenu 5 closes", icon: "gem", condition: "closes >= 5", unlockedAt: null },
    // Streak
    { id: "b5", name: "7 jours actif", description: "A été actif 7 jours consécutifs", icon: "bolt", condition: "streak >= 7", unlockedAt: null },
    { id: "b6", name: "30 jours actif", description: "A été actif 30 jours consécutifs", icon: "crown", condition: "streak >= 30", unlockedAt: null },
    // Missions
    { id: "b8", name: "Première mission", description: "A complété sa première mission", icon: "medal", condition: "missions >= 1", unlockedAt: null },
    // Sessions
    { id: "b9", name: "Première session", description: "A créé sa première session", icon: "calendar", condition: "sessions >= 1", unlockedAt: null },
    { id: "b10", name: "10 sessions", description: "A créé 10 sessions", icon: "calendar-check", condition: "sessions >= 10", unlockedAt: null },
    // Journal
    { id: "b11", name: "Première entrée", description: "A écrit sa première entrée journal", icon: "pen", condition: "journal >= 1", unlockedAt: null },
    { id: "b12", name: "Journal régulier", description: "A écrit 20 entrées journal", icon: "book", condition: "journal >= 20", unlockedAt: null },
    // Social
    { id: "b13", name: "Premier wing", description: "A ajouté son premier wing", icon: "handshake", condition: "wings >= 1", unlockedAt: null },
    { id: "b14", name: "Équipe de wings", description: "A ajouté 5 wings", icon: "users", condition: "wings >= 5", unlockedAt: null },
    // Contacts
    { id: "b15", name: "Premier contact", description: "A ajouté son premier contact", icon: "phone", condition: "contacts >= 1", unlockedAt: null },
    { id: "b16", name: "Premier date", description: "A planifié son premier rendez-vous", icon: "heart", condition: "dates >= 1", unlockedAt: null },
    // Level
    { id: "b17", name: "Niveau 5", description: "A atteint le niveau 5", icon: "star", condition: "level >= 5", unlockedAt: null },
    { id: "b18", name: "Niveau 10", description: "A atteint le niveau 10", icon: "star-fill", condition: "level >= 10", unlockedAt: null },
  ];
}

export function generateDefaultMilestones(): Milestone[] {
  return [
    // Interactions
    { id: "m1", name: "10 interactions", target: 10, current: 0, icon: "📊", unlockedAt: null },
    { id: "m2", name: "50 interactions", target: 50, current: 0, icon: "📈", unlockedAt: null },
    { id: "m3", name: "100 interactions", target: 100, current: 0, icon: "🚀", unlockedAt: null },
    // Closes
    { id: "m4", name: "5 closes", target: 5, current: 0, icon: "💫", unlockedAt: null },
    { id: "m5", name: "10 closes", target: 10, current: 0, icon: "⭐", unlockedAt: null },
    { id: "m6", name: "25 closes", target: 25, current: 0, icon: "💎", unlockedAt: null },
    // Dates
    { id: "m7", name: "5 dates", target: 5, current: 0, icon: "❤️", unlockedAt: null },
    { id: "m8", name: "10 dates", target: 10, current: 0, icon: "💕", unlockedAt: null },
    // Sessions
    { id: "m9", name: "5 sessions", target: 5, current: 0, icon: "📅", unlockedAt: null },
    { id: "m10", name: "20 sessions", target: 20, current: 0, icon: "📆", unlockedAt: null },
    // Journal
    { id: "m11", name: "10 entrées journal", target: 10, current: 0, icon: "📝", unlockedAt: null },
    { id: "m12", name: "50 entrées journal", target: 50, current: 0, icon: "📖", unlockedAt: null },
    // Social
    { id: "m13", name: "3 wings", target: 3, current: 0, icon: "🤝", unlockedAt: null },
    // Streak
    { id: "m14", name: "30 jours actifs", target: 30, current: 0, icon: "🔥", unlockedAt: null },
    { id: "m15", name: "Niveau 10", target: 10, current: 0, icon: "🌟", unlockedAt: null },
    // Contacts
    { id: "m16", name: "10 contacts", target: 10, current: 0, icon: "📱", unlockedAt: null },
  ];
}

export function generateDefaultGamification(): GamificationState {
  return {
    xpEvents: [],
    streak: 0,
    bestStreak: 0,
    bestLevel: 1,
    lastActiveDate: "",
    dailyInteractionXp: 0,
    dailyDate: "",
    badges: generateDefaultBadges(),
    milestones: generateDefaultMilestones(),
  };
}

export const BADGE_CATEGORIES: BadgeCategory[] = [
  {
    id: "interactions", label: "Interactions", key: "interactions",
    description: "Nombre total d'interactions réalisées avec des inconnues",
    tiers: [
      { threshold: 1, name: "Ice Breaker", icon: "target", description: "A brisé la glace pour la première fois" },
      { threshold: 10, name: "Causeur", icon: "flame", description: "A engagé 10 conversations" },
      { threshold: 50, name: "Social Butterfly", icon: "sparkle", description: "50 interactions au compteur" },
      { threshold: 100, name: "Machine à Parler", icon: "bolt", description: "100 interactions — une vraie machine" },
      { threshold: 500, name: "Légende Sociale", icon: "crown", description: "500 interactions — statut légendaire" },
    ],
  },
  {
    id: "closes", label: "Closes", key: "closes",
    description: "Nombre de numéros ou contacts obtenus",
    tiers: [
      { threshold: 1, name: "Premier Sang", icon: "sparkle", description: "A obtenu son tout premier close" },
      { threshold: 5, name: "Séducteur", icon: "gem", description: "5 closes réussis" },
      { threshold: 10, name: "Closer Pro", icon: "trophy", description: "10 closes — un vrai pro" },
      { threshold: 25, name: "Heartbreaker", icon: "heart", description: "25 closes au compteur" },
      { threshold: 50, name: "Close Machine", icon: "crown", description: "50 closes — machine inarrêtable" },
    ],
  },
  {
    id: "dates", label: "Dates", key: "dates",
    description: "Nombre de rendez-vous planifiés ou réalisés",
    tiers: [
      { threshold: 1, name: "First Date", icon: "heart", description: "A décroché son premier rendez-vous" },
      { threshold: 5, name: "Lover Boy", icon: "sparkle", description: "5 dates organisés" },
      { threshold: 10, name: "Dateur Pro", icon: "gem", description: "10 dates — expert confirmé" },
      { threshold: 25, name: "Roi du Rendez-vous", icon: "crown", description: "25 dates — roi incontesté" },
    ],
  },
  {
    id: "sessions", label: "Sessions", key: "sessions",
    description: "Sessions de game créées ou rejointes",
    tiers: [
      { threshold: 1, name: "Rookie", icon: "calendar", description: "A participé à sa première session" },
      { threshold: 5, name: "Habitué", icon: "calendar-check", description: "5 sessions au compteur" },
      { threshold: 10, name: "Régulier", icon: "target", description: "10 sessions — un régulier" },
      { threshold: 25, name: "Vétéran", icon: "trophy", description: "25 sessions — vétéran du terrain" },
      { threshold: 50, name: "No Life du Game", icon: "crown", description: "50 sessions — dévotion totale" },
    ],
  },
  {
    id: "wings", label: "Wings", key: "wings",
    description: "Nombre de wings ajoutés à ton réseau",
    tiers: [
      { threshold: 1, name: "Solo Plus One", icon: "handshake", description: "A trouvé son premier wing" },
      { threshold: 3, name: "Squad Leader", icon: "users", description: "3 wings dans l'équipe" },
      { threshold: 5, name: "Chef de Meute", icon: "trophy", description: "5 wings — une vraie meute" },
      { threshold: 10, name: "Général", icon: "crown", description: "10 wings — général de l'armée" },
    ],
  },
  {
    id: "streak", label: "Jours actifs", key: "streak",
    description: "Nombre de jours consécutifs d'activité",
    tiers: [
      { threshold: 3, name: "Motivé", icon: "bolt", description: "3 jours actifs d'affilée" },
      { threshold: 7, name: "Discipliné", icon: "flame", description: "Une semaine complète d'activité" },
      { threshold: 14, name: "Acharné", icon: "target", description: "14 jours sans relâche" },
      { threshold: 30, name: "Inarrêtable", icon: "trophy", description: "30 jours — rien ne l'arrête" },
      { threshold: 60, name: "Machine de Guerre", icon: "gem", description: "60 jours de discipline pure" },
      { threshold: 100, name: "Légende Vivante", icon: "crown", description: "100 jours — légende vivante" },
    ],
  },
  {
    id: "journal", label: "Journal", key: "journal",
    description: "Entrées rédigées dans le journal personnel",
    tiers: [
      { threshold: 1, name: "Première Note", icon: "pen", description: "A écrit sa première entrée" },
      { threshold: 10, name: "Chroniqueur", icon: "book", description: "10 entrées journal rédigées" },
      { threshold: 20, name: "Écrivain", icon: "medal", description: "20 entrées — un vrai écrivain" },
      { threshold: 50, name: "Philosophe du Game", icon: "star-fill", description: "50 entrées — philosophe du game" },
    ],
  },
  {
    id: "contacts", label: "Contacts", key: "contacts",
    description: "Contacts ajoutés dans le pipeline",
    tiers: [
      { threshold: 1, name: "Premier Numéro", icon: "phone", description: "A enregistré son premier contact" },
      { threshold: 5, name: "Collecteur", icon: "target", description: "5 contacts dans le pipeline" },
      { threshold: 10, name: "Réseauteur", icon: "users", description: "10 contacts — réseauteur confirmé" },
      { threshold: 25, name: "Carnet Plein", icon: "trophy", description: "25 contacts au répertoire" },
      { threshold: 50, name: "Social King", icon: "crown", description: "50 contacts — roi du social" },
    ],
  },
  {
    id: "missions", label: "Missions", key: "missions",
    description: "Missions quotidiennes et hebdomadaires complétées",
    tiers: [
      { threshold: 1, name: "Première Mission", icon: "medal", description: "A complété sa première mission" },
      { threshold: 5, name: "Agent en Herbe", icon: "target", description: "5 missions accomplies" },
      { threshold: 10, name: "Agent Double", icon: "gem", description: "10 missions — agent confirmé" },
      { threshold: 25, name: "Agent Secret", icon: "crown", description: "25 missions — agent d'élite" },
    ],
  },
  {
    id: "level", label: "Niveau", key: "level",
    description: "Niveau atteint grâce à l'XP accumulée",
    tiers: [
      { threshold: 5, name: "Apprenti", icon: "star", description: "A atteint le niveau 5" },
      { threshold: 10, name: "Confirmé", icon: "star-fill", description: "Niveau 10 — gamer confirmé" },
      { threshold: 20, name: "Expert", icon: "gem", description: "Niveau 20 — expertise reconnue" },
      { threshold: 50, name: "Maître du Game", icon: "crown", description: "Niveau 50 — maître absolu" },
    ],
  },
];
