"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_NAME_PRO, PRICE_MONTHLY } from "@/lib/premium";
import { useSubscription } from "@/hooks/useSubscription";

const CATEGORIES = [
  { key: "all", label: "Tout" },
  { key: "tracking", label: "Tracking" },
  { key: "social", label: "Social" },
  { key: "gamification", label: "Gamification" },
  { key: "analytics", label: "Analytics" },
  { key: "tools", label: "Outils" },
];

interface GuideFeature {
  title: string;
  description: string;
  details: string[];
  icon: string;
  color: string;
  category: string;
  plan: "free" | "gamemax" | "both";
  href?: string;
}

const GUIDE_FEATURES: GuideFeature[] = [
  // ─── TRACKING ───
  {
    title: "Tracker d'interactions",
    description: "Log chaque approche avec un niveau de détail inégalé. Type, résultat, durée, ressenti, confiance, lieu, photos et tags.",
    details: [
      "3 types d'approche : Direct, Indirect, Situationnel",
      "Résultats : Close, Neutre, Rejet avec raison",
      "Scores de ressenti et confiance (1-10)",
      "Photos contextuelles et tags personnalisés",
      "Lien automatique vers contacts et sessions",
    ],
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "from-[#c084fc] to-[#818cf8]",
    category: "tracking",
    plan: "both",
    href: "/interactions",
  },
  {
    title: "Pipeline CRM",
    description: "Gère tes contacts comme un pro avec un Kanban drag-and-drop. Du premier numéro au rendez-vous, suis chaque étape.",
    details: [
      "10 statuts : Nouveau → Contacté → Répondu → Date → Close → Avancé",
      "Vue Kanban et vue liste",
      "Rappels avec dates et labels personnalisés",
      "Timeline complète de chaque contact",
      "Archivage avec raison (ghosted, en couple, etc.)",
    ],
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    color: "from-[#f59e0b] to-[#f472b6]",
    category: "tracking",
    plan: "both",
    href: "/contacts",
  },
  {
    title: "Journal & Réflexion",
    description: "Écris tes réflexions, mindset et field reports. Éditeur riche avec voice input, tags et pièces jointes.",
    details: [
      "Éditeur riche : gras, italique, listes, liens, titres",
      "Entrée vocale pour noter rapidement",
      "Tags : Mindset, Progress, Peur, Réflexion, Motivation",
      "Visibilité : Privé, Wings, Public",
      "Brouillons avec sauvegarde automatique",
    ],
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    color: "from-[#67e8f9] to-[#c084fc]",
    category: "tracking",
    plan: "both",
    href: "/journal",
  },
  {
    title: "Collections & Partage de journal",
    description: "Regroupe tes entrées en collections thématiques, collabore avec tes wings et partage via lien avec expiration.",
    details: [
      "Collections pour organiser par thème ou période",
      "Journal collaboratif à plusieurs auteurs",
      "Liens de partage avec date d'expiration",
      "Export de tes entrées",
    ],
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    color: "from-[#67e8f9] to-[#34d399]",
    category: "tracking",
    plan: "gamemax",
    href: "/journal",
  },
  {
    title: "Sessions & Sorties",
    description: "Organise tes sorties de groupe avec lieu, carte, participants et objectifs. Vue liste, calendrier et carte.",
    details: [
      "Titre, lieu avec sélection sur carte",
      "Liste de participants avec statut (accepté/décliné)",
      "Objectifs avec checklist de progression",
      "Interactions liées à chaque session",
      "Likes et commentaires de la communauté",
    ],
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "from-[#818cf8] to-[#c084fc]",
    category: "tracking",
    plan: "both",
    href: "/sessions",
  },

  // ─── SOCIAL ───
  {
    title: "Système de Wings",
    description: "Trouve et gère tes partenaires de sortie. Catégorise, note et organise des sessions ensemble.",
    details: [
      "Envoie et accepte des demandes de wing",
      "Catégories : Favori, Régulier, Occasionnel",
      "Notes et métadonnées par wing",
      "Statuts : Disponible, En session, Occupé",
      "Messages directs avec chaque wing",
    ],
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
    color: "from-[#34d399] to-[#818cf8]",
    category: "social",
    plan: "both",
    href: "/wings",
  },
  {
    title: "Challenges entre Wings",
    description: "Lance des défis head-to-head avec tes wings. Compare vos approches, closes et sessions sur une période.",
    details: [
      "Challenges personnalisés (approches, closes, sessions)",
      "Tracking en temps réel des deux côtés",
      "Historique des challenges terminés",
    ],
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    color: "from-[#f472b6] to-[#f59e0b]",
    category: "social",
    plan: "gamemax",
    href: "/wings",
  },
  {
    title: "Wing Pings & Découverte",
    description: "Envoie un ping de localisation \"Je suis de sortie, qui vient ?\" et découvre des wings dans ta ville.",
    details: [
      "Ping géolocalisé pour signaler ta présence",
      "Carte des wings à proximité",
      "Découverte de nouveaux wings par ville",
      "Notifications push en temps réel",
    ],
    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
    color: "from-[#34d399] to-[#67e8f9]",
    category: "social",
    plan: "gamemax",
    href: "/wings",
  },
  {
    title: "Feed Communautaire",
    description: "Partage tes succès, field reports et milestones. Réagis et commente les posts des autres.",
    details: [
      "Posts texte, photos (jusqu'à 4), sessions, milestones",
      "5 réactions : Feu, Bravo, Couronne, Force, Respect",
      "Commentaires avec threading",
      "Hashtags et mentions",
      "Visibilité : Wings seulement ou Public",
    ],
    icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z",
    color: "from-[#818cf8] to-[#f472b6]",
    category: "social",
    plan: "free",
    href: "/feed",
  },
  {
    title: "Classement & Leaderboard",
    description: "Compare-toi aux autres joueurs par XP, niveau, streak ou progression hebdomadaire. Filtre par ville.",
    details: [
      "Classement global et wings seulement",
      "Tri par XP, XP hebdo, streak, niveau",
      "Filtre par ville/localisation",
      "Comparaison de profils côte à côte (GameMax)",
      "Breakdown de XP par source",
    ],
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172",
    color: "from-[#f59e0b] to-[#c084fc]",
    category: "social",
    plan: "both",
    href: "/leaderboard",
  },
  {
    title: "Messages",
    description: "Messagerie directe avec tes wings et groupes. Historique complet et notifications de messages non lus.",
    details: [
      "Conversations 1-on-1 avec chaque wing",
      "Messages de groupe",
      "Compteur de non-lus",
      "Historique complet",
    ],
    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
    color: "from-[#c084fc] to-[#67e8f9]",
    category: "social",
    plan: "free",
    href: "/messages",
  },

  // ─── GAMIFICATION ───
  {
    title: "Système XP & Niveaux",
    description: "Gagne de l'XP pour chaque action : interactions, closes, journal, missions, pipeline. Monte de niveau et débloque des récompenses.",
    details: [
      "XP pour interactions, closes, journal, missions, pipeline, streaks",
      "Courbe de progression par niveau",
      "Cap d'XP quotidien pour éviter le farming",
      "Multiplicateur de streak pour les séries",
    ],
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    color: "from-[#c084fc] to-[#f472b6]",
    category: "gamification",
    plan: "free",
    href: "/progression",
  },
  {
    title: "Badges & Milestones",
    description: "Débloque 18+ badges progressifs liés à tes accomplissements. Chaque badge a plusieurs niveaux.",
    details: [
      "Badges : Première interaction, 10 interactions, 50+",
      "Badges closes : 1, 5+",
      "Badges streaks : 7 jours, 30 jours",
      "Badges sessions, journal, wings, dates, missions",
      "Système de tiers (plusieurs niveaux par badge)",
    ],
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
    color: "from-[#f472b6] to-[#f59e0b]",
    category: "gamification",
    plan: "both",
    href: "/progression",
  },
  {
    title: "Rang de Compétence",
    description: "Score automatique de 0 à 100 basé sur ton close rate, ressenti, volume et régularité. 7 rangs à atteindre.",
    details: [
      "Score calculé : Close rate (45%), Ressenti (25%), Volume (18%), Streak (12%)",
      "7 rangs : Débutant → Apprenti → Intermédiaire → Confirmé → Avancé → Expert → Maître",
      "Visualisation détaillée des composantes",
    ],
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    color: "from-[#818cf8] to-[#34d399]",
    category: "gamification",
    plan: "gamemax",
    href: "/progression",
  },
  {
    title: "Missions & Challenges",
    description: "Crée des missions daily, weekly ou custom avec suivi automatique. Gagne de l'XP en les complétant.",
    details: [
      "Missions daily : objectifs quotidiens renouvelés",
      "Missions weekly & custom (GameMax)",
      "Tracking automatique : interactions, closes, sessions, journal",
      "Progression manuelle pour objectifs custom",
      "XP reward + deadline optionnelle",
    ],
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    color: "from-[#34d399] to-[#f59e0b]",
    category: "gamification",
    plan: "both",
    href: "/missions",
  },

  // ─── ANALYTICS ───
  {
    title: "Dashboard",
    description: "Vue d'ensemble complète : interactions du jour, XP, streak, close rate, missions actives. Tout en un coup d'oeil.",
    details: [
      "Stats du jour et de la semaine",
      "Close rate et tendances",
      "Missions actives et progression",
      "Activité récente",
      "Barre XP et niveau actuel",
    ],
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
    color: "from-[#c084fc] to-[#818cf8]",
    category: "analytics",
    plan: "free",
    href: "/",
  },
  {
    title: "Analytics Avancés & Rapports",
    description: "Graphiques d'évolution, heatmap d'activité, distribution des types, tendances de confiance et ressenti sur 12 semaines.",
    details: [
      "Interactions par semaine (12 semaines)",
      "Close rate par semaine (8 semaines)",
      "Distribution par type et résultat",
      "Tendances ressenti et confiance (moyenne mobile)",
      "Top objections rencontrées",
      "Heatmap de fréquence d'activité",
      "Comparaison mois vs mois précédent",
      "Filtrage par période (mensuel, trimestriel, all-time)",
    ],
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "from-[#818cf8] to-[#67e8f9]",
    category: "analytics",
    plan: "gamemax",
    href: "/reports",
  },
  {
    title: "Export PDF",
    description: "Génère un rapport PDF complet avec tous tes graphiques et statistiques. Parfait pour le suivi avec un coach.",
    details: [
      "Rapport PDF avec charts et stats",
      "Généré via jsPDF + html2canvas",
      "Inclut toutes les métriques clés",
    ],
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    color: "from-[#f59e0b] to-[#818cf8]",
    category: "analytics",
    plan: "gamemax",
    href: "/reports",
  },
  {
    title: "Coaching IA Personnalisé",
    description: "Reçois un coaching sur-mesure basé sur tes données : diagnostic, points forts, axes d'amélioration et mission de la semaine.",
    details: [
      "Analyse de tes 10 dernières interactions",
      "Score de compétence et tendances",
      "Diagnostic personnalisé en 4 parties",
      "Mission hebdomadaire sur-mesure",
      "Propulsé par l'IA Claude",
    ],
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
    color: "from-[#c084fc] to-[#f472b6]",
    category: "analytics",
    plan: "gamemax",
  },

  // ─── TOOLS ───
  {
    title: "Calendrier",
    description: "Visualise tes interactions et sessions sur un calendrier. Vues mois, semaine et jour avec compteurs.",
    details: [
      "Vue mois avec indicateurs d'activité",
      "Vue semaine et jour (GameMax)",
      "Countdown des sessions à venir",
      "Compteurs d'interactions par jour",
    ],
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    color: "from-[#34d399] to-[#818cf8]",
    category: "tools",
    plan: "both",
    href: "/calendrier",
  },
  {
    title: "Notifications Push",
    description: "Reçois des rappels et notifications directement sur ton téléphone. Rappels de contacts, sessions et milestones.",
    details: [
      "Notifications push Web (PWA)",
      "Rappels de contacts et sessions",
      "Alertes de milestones et badges",
      "Configurable dans les paramètres",
    ],
    icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
    color: "from-[#f472b6] to-[#c084fc]",
    category: "tools",
    plan: "free",
    href: "/settings",
  },
  {
    title: "Mode Hors-ligne",
    description: "Continue à utiliser l'app sans connexion. Tes données se synchronisent automatiquement quand tu reviens en ligne.",
    details: [
      "IndexedDB pour le cache local",
      "File d'attente de synchronisation",
      "Bannière de statut hors-ligne",
      "Sync automatique au retour en ligne",
    ],
    icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
    color: "from-[#67e8f9] to-[#34d399]",
    category: "tools",
    plan: "free",
  },
  {
    title: "Parrainage",
    description: "Invite tes potes avec ton lien unique. Vous gagnez tous les deux 7 jours de GameMax. S'il souscrit, tu gagnes 1 mois.",
    details: [
      "Lien de parrainage unique",
      "7 jours GameMax pour le filleul",
      "7 jours GameMax pour le parrain",
      "1 mois offert si le filleul souscrit",
    ],
    icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z",
    color: "from-[#34d399] to-[#f59e0b]",
    category: "tools",
    plan: "free",
    href: "/settings",
  },
];

function PlanBadge({ plan }: { plan: "free" | "gamemax" | "both" }) {
  if (plan === "gamemax") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[9px] font-bold text-white uppercase tracking-wider">
        {PLAN_NAME_PRO}
      </span>
    );
  }
  if (plan === "free") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[var(--surface-high)] text-[9px] font-bold text-[var(--outline)] uppercase tracking-wider">
        Gratuit
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[var(--surface-high)] text-[9px] font-bold text-[var(--outline)] uppercase tracking-wider">
        Gratuit
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[9px] font-bold text-white uppercase tracking-wider">
        {PLAN_NAME_PRO}
      </span>
    </div>
  );
}

export default function GuidePage() {
  const [filter, setFilter] = useState("all");
  const { isPremium, checkout } = useSubscription();

  const filtered = filter === "all" ? GUIDE_FEATURES : GUIDE_FEATURES.filter((f) => f.category === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-3">
          Guide Complet GameProgress
        </h1>
        <p className="text-sm text-[var(--outline)] max-w-2xl mx-auto mb-2">
          Découvre toutes les fonctionnalités de la plateforme la plus complète pour progresser socialement et avec les femmes.
        </p>
        <p className="text-xs text-[var(--primary)] font-medium">
          {GUIDE_FEATURES.length} fonctionnalités — L&apos;app parfaite pour les gamers de la séduction
        </p>
      </div>

      {/* Category filters */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-1 p-1 rounded-[14px] glass-card overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`px-3 sm:px-4 py-2 rounded-[10px] text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === c.key ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* GameMax upgrade banner for free users */}
      {!isPremium && (
        <div className="rounded-[16px] bg-gradient-to-r from-[var(--primary)]/10 via-[var(--secondary)]/8 to-[var(--primary)]/10 border border-[var(--primary)]/15 p-5 flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--on-surface)]">
                Débloque toutes les fonctionnalités avec {PLAN_NAME_PRO}
              </p>
              <p className="text-xs text-[var(--outline)]">
                {PRICE_MONTHLY}&euro;/mois — Moins cher qu&apos;un kebab. Satisfait ou remboursé 14 jours.
              </p>
            </div>
          </div>
          <button
            onClick={checkout}
            className="shrink-0 px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-sm font-semibold hover:shadow-[0_0_20px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
          >
            Passer à {PLAN_NAME_PRO}
          </button>
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((f) => (
          <div
            key={f.title}
            className={`glass-card glass-reflect p-5 rounded-[var(--radius-card)] transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] ${f.plan === "gamemax" && !isPremium ? "opacity-80" : ""}`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0 shadow-lg`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{f.title}</h3>
                  <PlanBadge plan={f.plan} />
                </div>
                <p className="text-xs text-[var(--outline)] leading-relaxed">{f.description}</p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-3">
              {f.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-xs text-[var(--on-surface-variant)]">
                  <svg className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {d}
                </li>
              ))}
            </ul>

            {f.href && (
              <Link
                href={f.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--secondary)] transition-colors"
              >
                Accéder
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      {!isPremium && (
        <div className="mt-12 text-center">
          <p className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-2">
            Prêt à tout débloquer ?
          </p>
          <p className="text-sm text-[var(--outline)] mb-6">
            Passe à {PLAN_NAME_PRO} pour {PRICE_MONTHLY}&euro;/mois et accède à toutes les fonctionnalités sans limites.
          </p>
          <button
            onClick={checkout}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-[14px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-sm font-semibold hover:shadow-[0_0_32px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Passer à {PLAN_NAME_PRO} — {PRICE_MONTHLY}&euro;/mois
          </button>
          <p className="text-[10px] text-[var(--outline-variant)] mt-3">Satisfait ou remboursé 14 jours. Annulation en 1 clic.</p>
        </div>
      )}
    </div>
  );
}
