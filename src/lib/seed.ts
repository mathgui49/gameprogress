import type { Interaction, Contact, Mission, JournalEntry, GamificationState, Badge, Milestone } from "@/types";
import { generateId } from "./utils";

const DEFAULTS = { memorableElement: "", womanScore: 7, confidenceScore: 5, objection: null, objectionCustom: "", discussionTopics: "", feedback: "", contactMethod: null, contactValue: "", sessionId: "" } as const;

export function generateSeedInteractions(): Interaction[] {
  const now = new Date();
  const items: Omit<Interaction, "id" | "createdAt">[] = [
    { ...DEFAULTS, date: new Date(now.getTime() - 1 * 3600000).toISOString(), firstName: "Sophie", memorableElement: "Revenait du Japon", note: "Rencontre au cafe, conversation naturelle sur les voyages.", location: "Cafe Flore, Paris 6e", type: "direct", result: "close", duration: "long", feelingScore: 9, womanScore: 9, confidenceScore: 8, discussionTopics: "Voyages, Japon, cuisine asiatique", feedback: "Bonne ouverture, conversation fluide. Bien gere la transition vers le numero.", contactMethod: "instagram", contactValue: "@sophie" },
    { ...DEFAULTS, date: new Date(now.getTime() - 5 * 3600000).toISOString(), firstName: "Emma", memorableElement: "Cherchait Murakami", note: "Approche en librairie, elle cherchait Murakami. Echange sympa mais pressee.", location: "Librairie Gibert, Paris 5e", type: "situational", result: "neutral", duration: "medium", feelingScore: 7, womanScore: 7, confidenceScore: 3, feedback: "Bon opener situationnel mais j'aurais du etre plus direct sur l'intention." },
    { ...DEFAULTS, date: new Date(now.getTime() - 24 * 3600000).toISOString(), firstName: "Clara", note: "Directe dans la rue, bonne energie. Echange de numeros.", location: "Rue de Rivoli", type: "direct", result: "close", duration: "medium", feelingScore: 8, womanScore: 8, confidenceScore: 7, contactMethod: "phone", contactValue: "06 XX XX XX XX" },
    { ...DEFAULTS, date: new Date(now.getTime() - 26 * 3600000).toISOString(), firstName: "", memorableElement: "Fille au parc, robe jaune", note: "Approche au parc, en couple finalement.", location: "Jardin du Luxembourg", type: "direct", result: "rejection", duration: "short", feelingScore: 5, womanScore: 8, confidenceScore: 1, objection: "in_relationship" },
    { ...DEFAULTS, date: new Date(now.getTime() - 48 * 3600000).toISOString(), firstName: "Lea", note: "Rencontre en soiree chez des amis. Tres bon feeling, longue conversation.", location: "Soiree privee, Paris 11e", type: "indirect", result: "close", duration: "long", feelingScore: 9, womanScore: 9, confidenceScore: 9, discussionTopics: "Musique, films d'auteur, philosophie", contactMethod: "instagram", contactValue: "@lea" },
    { ...DEFAULTS, date: new Date(now.getTime() - 72 * 3600000).toISOString(), firstName: "Camille", note: "Approche directe, elle attendait le metro. Rapide mais bien execute.", location: "Metro Chatelet", type: "direct", result: "neutral", duration: "short", feelingScore: 6, womanScore: 6, confidenceScore: 2, objection: "busy" },
    { ...DEFAULTS, date: new Date(now.getTime() - 96 * 3600000).toISOString(), firstName: "Julie", memorableElement: "Tatouage lune sur le poignet", note: "Discussion spontanee a la salle de sport.", location: "Basic Fit, Paris 3e", type: "situational", result: "close", duration: "long", feelingScore: 8, womanScore: 8, confidenceScore: 7, discussionTopics: "Sport, nutrition, course a pied", contactMethod: "phone", contactValue: "06 XX XX XX XX" },
    { ...DEFAULTS, date: new Date(now.getTime() - 120 * 3600000).toISOString(), firstName: "", memorableElement: "Blonde, ecouteurs roses", note: "Approche dans le train, pas le bon moment.", location: "TGV Paris-Lyon", type: "direct", result: "rejection", duration: "short", feelingScore: 4, womanScore: 7, confidenceScore: 1, objection: "not_interested", feedback: "Mauvais timing, elle travaillait. Apprendre a mieux lire le contexte." },
    { ...DEFAULTS, date: new Date(now.getTime() - 144 * 3600000).toISOString(), firstName: "Alice", note: "Rencontre au vernissage. Echange Instagram.", location: "Galerie Perrotin, Paris 3e", type: "indirect", result: "close", duration: "medium", feelingScore: 7, womanScore: 7, confidenceScore: 6, contactMethod: "instagram", contactValue: "@alice" },
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
    { id: generateId(), title: "3 interactions aujourd'hui", description: "Fais 3 interactions dans la journee", type: "daily", target: 3, current: 1, xpReward: 30, completed: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "1 approche directe", description: "Fais au moins une approche directe", type: "daily", target: 1, current: 0, xpReward: 20, completed: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "Relancer 2 contacts", description: "Envoie un message a 2 contacts", type: "weekly", target: 2, current: 1, xpReward: 25, completed: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "Ecrire dans le journal", description: "Fais une entree dans ton journal", type: "daily", target: 1, current: 0, xpReward: 15, completed: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: generateId(), title: "10 interactions cette semaine", description: "Objectif hebdomadaire", type: "weekly", target: 10, current: 7, xpReward: 50, completed: false, createdAt: new Date().toISOString(), completedAt: null },
  ];
}

export function generateSeedJournal(): JournalEntry[] {
  const now = new Date();
  return [
    { id: generateId(), date: new Date(now.getTime() - 24 * 3600000).toISOString(), content: "Bonne journee aujourd'hui. J'ai reussi a faire 3 approches dont une directe qui s'est super bien passee. Je sens que je progresse sur la confiance.", tag: "progress", createdAt: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: generateId(), date: new Date(now.getTime() - 72 * 3600000).toISOString(), content: "Grosse peur avant de sortir aujourd'hui. J'ai quand meme fait 2 approches. La premiere etait maladroite mais la deuxieme beaucoup mieux.", tag: "fear", createdAt: new Date(now.getTime() - 72 * 3600000).toISOString() },
    { id: generateId(), date: new Date(now.getTime() - 168 * 3600000).toISOString(), content: "Bilan de la semaine : 8 interactions, 3 closes. Je suis content de ma regularite. Il faut que je travaille sur la duree des conversations.", tag: "review", createdAt: new Date(now.getTime() - 168 * 3600000).toISOString() },
  ];
}

export function generateDefaultBadges(): Badge[] {
  return [
    { id: "b1", name: "Premiere interaction", description: "Cree ta premiere interaction", icon: "🎯", condition: "interactions >= 1", unlockedAt: new Date(Date.now() - 168 * 3600000).toISOString() },
    { id: "b2", name: "10 interactions", description: "Atteins 10 interactions", icon: "🔥", condition: "interactions >= 10", unlockedAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: "b3", name: "Premier close", description: "Obtiens ton premier close", icon: "✨", condition: "closes >= 1", unlockedAt: new Date(Date.now() - 144 * 3600000).toISOString() },
    { id: "b4", name: "5 closes", description: "Obtiens 5 closes", icon: "💎", condition: "closes >= 5", unlockedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: "b5", name: "7 jours actif", description: "Sois actif 7 jours d'affilee", icon: "⚡", condition: "streak >= 7", unlockedAt: null },
    { id: "b6", name: "30 jours actif", description: "Sois actif 30 jours d'affilee", icon: "👑", condition: "streak >= 30", unlockedAt: null },
    { id: "b7", name: "50 interactions", description: "Atteins 50 interactions", icon: "🏆", condition: "interactions >= 50", unlockedAt: null },
    { id: "b8", name: "Premiere mission", description: "Complete ta premiere mission", icon: "🎖️", condition: "missions >= 1", unlockedAt: null },
  ];
}

export function generateDefaultMilestones(): Milestone[] {
  return [
    { id: "m1", name: "10 interactions", target: 10, current: 10, icon: "📊", unlockedAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: "m2", name: "50 interactions", target: 50, current: 10, icon: "📈", unlockedAt: null },
    { id: "m3", name: "100 interactions", target: 100, current: 10, icon: "🚀", unlockedAt: null },
    { id: "m4", name: "5 closes", target: 5, current: 5, icon: "💫", unlockedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: "m5", name: "10 closes", target: 10, current: 5, icon: "⭐", unlockedAt: null },
    { id: "m6", name: "10 dates", target: 10, current: 1, icon: "❤️", unlockedAt: null },
    { id: "m7", name: "30 jours actifs", target: 30, current: 5, icon: "🔥", unlockedAt: null },
  ];
}

export function generateDefaultGamification(): GamificationState {
  return {
    xp: 0,
    level: 1,
    xpEvents: [],
    streak: 0,
    bestStreak: 0,
    lastActiveDate: "",
    badges: generateDefaultBadges(),
    milestones: generateDefaultMilestones(),
  };
}
