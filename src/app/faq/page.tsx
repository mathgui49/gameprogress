"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PLAN_NAME_PRO, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/premium";

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const FAQ_CATEGORIES = [
  { key: "all", label: "Tout", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
  { key: "general", label: "General", icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" },
  { key: "account", label: "Compte", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { key: "features", label: "Fonctionnalites", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  { key: "gamification", label: "Gamification", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" },
  { key: "premium", label: PLAN_NAME_PRO, icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
  { key: "social", label: "Social", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4 0 2.25 2.25 0 014 0z" },
  { key: "privacy", label: "Confidentialite", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
];

const FAQ_DATA: FaqItem[] = [
  // ─── GENERAL ───
  { category: "general", q: "C'est quoi GameProgress ?", a: "GameProgress est une application gamifiee de progression sociale. Elle te permet de tracker tes interactions, gerer tes contacts dans un pipeline CRM, progresser avec un systeme de XP/niveaux/badges, et analyser tes stats en detail. Pense a un mix entre un tracker d'habitudes, un CRM et un jeu RPG." },
  { category: "general", q: "A qui s'adresse l'application ?", a: "A toute personne qui souhaite ameliorer ses competences sociales de maniere structuree et motivante. Que tu sois debutant ou experimente, le systeme de gamification et d'analytics t'aide a rester motive et a mesurer ta progression objectivement." },
  { category: "general", q: "L'application est-elle gratuite ?", a: `Oui, GameProgress propose un plan gratuit avec les fonctionnalites essentielles (15 interactions/mois, 5 contacts, 3 journaux/mois). Pour un usage illimite et toutes les fonctionnalites avancees, tu peux passer a ${PLAN_NAME_PRO} a partir de ${PRICE_MONTHLY}\u20ac/mois.` },
  { category: "general", q: "Comment installer l'app sur mon telephone ?", a: "GameProgress est une PWA (Progressive Web App). Sur iPhone : ouvre le site dans Safari, appuie sur le bouton Partager, puis 'Sur l'ecran d'accueil'. Sur Android : ouvre dans Chrome, un bandeau d'installation apparait automatiquement, ou va dans le menu > 'Installer l'application'." },
  { category: "general", q: "L'app fonctionne-t-elle hors-ligne ?", a: "Oui ! Grace au systeme de cache local (IndexedDB), tu peux consulter tes donnees et meme ajouter des interactions sans connexion. Tout se synchronise automatiquement quand tu reviens en ligne." },
  { category: "general", q: "Sur quels appareils fonctionne GameProgress ?", a: "GameProgress fonctionne sur tous les appareils modernes : iPhone, Android, tablettes, PC et Mac. C'est une application web responsive qui s'adapte a toutes les tailles d'ecran." },

  // ─── ACCOUNT ───
  { category: "account", q: "Comment creer un compte ?", a: "Clique sur 'Commencer' et connecte-toi avec ton compte Google. Ton profil est cree automatiquement. Tu peux ensuite personnaliser ton nom, photo de profil, objectifs et preferences dans les parametres." },
  { category: "account", q: "Puis-je changer mon nom d'utilisateur ?", a: "Oui, va dans Parametres > Profil. Tu peux modifier ton nom d'affichage, ton username (visible dans le classement et par tes wings), ta bio et ta photo de profil a tout moment." },
  { category: "account", q: "Comment supprimer mon compte ?", a: "Va dans Parametres > Danger Zone. Tu y trouveras l'option de suppression de compte. Attention : cette action est irreversible et supprimera toutes tes donnees (interactions, contacts, messages, etc.)." },
  { category: "account", q: "Mes donnees sont-elles securisees ?", a: "Oui. Tes donnees sont stockees de maniere securisee sur Supabase (infrastructure cloud). L'authentification passe par Google OAuth. Tes donnees personnelles ne sont jamais partagees avec des tiers. Tu peux configurer la visibilite de ton profil dans les parametres de confidentialite." },
  { category: "account", q: "Comment changer ma photo de profil ?", a: "Va dans ton Profil (icone en haut a droite ou dans le menu), clique sur ta photo actuelle ou l'icone d'edition. L'image sera automatiquement compressée et redimensionnee pour optimiser les performances." },

  // ─── FEATURES ───
  { category: "features", q: "Comment tracker une interaction ?", a: "Va dans Interactions > Nouveau (+). Remplis le type (Direct, Indirect, Situationnel), le resultat (Close, Neutre, Rejet), tes scores de ressenti et confiance (1-10), et ajoute des notes ou photos. Tu gagnes de l'XP a chaque interaction loguee." },
  { category: "features", q: "Comment fonctionne le pipeline CRM ?", a: "Le pipeline te permet de suivre tes contacts du premier numero jusqu'au rendez-vous. Chaque contact passe par des etapes : Nouveau > Contacte > Repondu > Date planifie > Premier date > Kiss close > etc. Tu peux voir le tout en vue Kanban (drag & drop) ou en liste." },
  { category: "features", q: "Comment fonctionnent les sessions ?", a: "Les sessions representent tes sorties. Tu peux creer une session avec un lieu (selection sur carte), inviter des participants, definir des objectifs et lier des interactions. Vue calendrier, liste et carte disponibles." },
  { category: "features", q: "Comment fonctionne le journal ?", a: "Le journal est un espace pour tes reflexions, field reports et mindset. L'editeur riche supporte le gras, italique, listes, titres et plus. Tu peux ajouter des tags (Mindset, Progress, Peur, etc.) et choisir la visibilite (Prive, Wings, Public)." },
  { category: "features", q: "A quoi sert le calendrier ?", a: "Le calendrier affiche tes interactions et sessions sur une timeline visuelle. Vue mois disponible en gratuit, vues semaine et jour avec ${PLAN_NAME_PRO}. Les jours avec activite sont marques pour voir ta regularite." },
  { category: "features", q: "Comment fonctionne l'export PDF ?", a: `L'export PDF (${PLAN_NAME_PRO}) genere un rapport multi-pages avec une page de garde, tes metriques cles, graphiques d'activite, taux de close, ressenti, entonnoir de conversion et plus. Le fichier est compresse en JPEG pour rester leger.` },
  { category: "features", q: "Comment utiliser la messagerie ?", a: "La messagerie te permet de discuter en prive avec tes wings ou en groupe. Tu peux creer des groupes, partager des images, epingler des messages, repondre en thread et rechercher dans l'historique. Les messages non lus sont comptes sur chaque conversation." },
  { category: "features", q: "C'est quoi le coaching IA ?", a: `Le coaching IA (${PLAN_NAME_PRO}) analyse tes 10 dernieres interactions et te fournit un diagnostic personnalise en 4 parties : points forts, axes d'amelioration, tendances et une mission hebdomadaire sur-mesure. Propulse par l'IA Claude.` },

  // ─── GAMIFICATION ───
  { category: "gamification", q: "Comment fonctionne le systeme d'XP ?", a: "Tu gagnes de l'XP pour chaque action : interactions (+10-30 XP), closes (+20 XP bonus), journal (+15 XP), missions completees (+XP variable), streaks (+multiplicateur). L'XP accumule te fait monter de niveau selon une courbe progressive." },
  { category: "gamification", q: "Comment fonctionnent les niveaux ?", a: "Chaque niveau necessite plus d'XP que le precedent (courbe exponentielle). La formule est 50 * niveau^1.7. Par exemple, le niveau 5 necessite ~500 XP cumules, le niveau 10 ~1,600 XP. Il n'y a pas de plafond de niveau." },
  { category: "gamification", q: "Comment fonctionnent les streaks ?", a: "Un streak represente le nombre de jours consecutifs ou tu as loguee au moins une interaction. Chaque jour actif prolonge ton streak, et un jour sans activite le remet a zero. Un multiplicateur de streak augmente tes gains d'XP." },
  { category: "gamification", q: "Comment debloquer des badges ?", a: "Les badges se debloquent automatiquement quand tu atteins certains milestones : premiere interaction, 10 interactions, 50+, premier close, 5 closes, streaks de 7j et 30j, etc. Chaque badge a plusieurs tiers progressifs." },
  { category: "gamification", q: "C'est quoi le rang de competence ?", a: `Le rang (${PLAN_NAME_PRO}) est un score de 0 a 100 calcule automatiquement : Close rate (45%), Ressenti moyen (25%), Volume d'interactions (18%), Streak (12%). 7 rangs : Debutant, Apprenti, Intermediaire, Confirme, Avance, Expert, Maitre.` },
  { category: "gamification", q: "Comment fonctionnent les missions ?", a: "Les missions sont des objectifs avec suivi automatique ou manuel. Types : nombre d'interactions, de closes, sessions, journal. Tu fixes un objectif, une deadline optionnelle et un reward XP. Missions daily en gratuit, weekly et custom avec ${PLAN_NAME_PRO}." },
  { category: "gamification", q: "Mon XP peut-il baisser ?", a: "Oui, un systeme de decay est en place pour encourager la regularite. L'XP des interactions perd la moitie de sa valeur chaque mois d'inactivite. Les autres sources d'XP decroissent plus lentement (moitie tous les 3 mois). C'est pour que le classement reflète l'activite recente." },

  // ─── PREMIUM ───
  { category: "premium", q: `C'est quoi ${PLAN_NAME_PRO} ?`, a: `${PLAN_NAME_PRO} est l'abonnement premium qui debloque toutes les fonctionnalites sans limites : interactions illimitees, contacts illimites, analytics avances, coaching IA, export PDF, missions custom, challenges entre wings, et plus encore.` },
  { category: "premium", q: `Combien coute ${PLAN_NAME_PRO} ?`, a: `${PLAN_NAME_PRO} est disponible a ${PRICE_MONTHLY}\u20ac/mois ou ${PRICE_YEARLY}\u20ac/an (soit ~${(PRICE_YEARLY / 12).toFixed(2)}\u20ac/mois). Le paiement est securise via Stripe.` },
  { category: "premium", q: "Comment annuler mon abonnement ?", a: `Va dans Parametres > Abonnement > Gerer. Tu seras redirige vers le portail Stripe ou tu peux annuler en 1 clic. Tu conserves l'acces ${PLAN_NAME_PRO} jusqu'a la fin de la periode payee.` },
  { category: "premium", q: "Y a-t-il une periode d'essai ?", a: "Pas de periode d'essai classique, mais tu peux utiliser le plan gratuit sans limite de temps. De plus, ${PLAN_NAME_PRO} est satisfait ou rembourse pendant 14 jours. Tu peux aussi gagner des jours gratuits via le parrainage." },
  { category: "premium", q: "Comment fonctionne le parrainage ?", a: `Partage ton lien de parrainage unique (disponible dans Parametres > Parrainage). Quand quelqu'un s'inscrit via ton lien, tu gagnes 7 jours de ${PLAN_NAME_PRO} gratuit. Cumul illimite !` },
  { category: "premium", q: `Quelles sont les limites du plan gratuit ?`, a: `Le plan gratuit inclut : 15 interactions/mois, 5 contacts actifs, 3 journaux/mois, 2 sessions/mois, 3 wings max, missions daily, statistiques de la semaine en cours, 5 badges, vue mois du calendrier. Tout le reste est debloque avec ${PLAN_NAME_PRO}.` },

  // ─── SOCIAL ───
  { category: "social", q: "C'est quoi un Wing ?", a: "Un wing est un partenaire de sortie. Tu peux ajouter des wings, les categoriser (Favori, Regulier, Occasionnel), leur envoyer des messages, organiser des sessions ensemble et comparer vos stats. C'est le coeur social de l'app." },
  { category: "social", q: "Comment ajouter un wing ?", a: "Va dans Wings > cherche par username ou email. Envoie une demande de wing. Une fois acceptee, vous pouvez vous envoyer des messages, voir vos stats respectives et organiser des sessions ensemble." },
  { category: "social", q: "Comment fonctionne le classement ?", a: "Le classement compare les utilisateurs par XP total, XP hebdomadaire, streak ou niveau. Tu peux filtrer par ville et choisir entre le classement global ou wings seulement. En gratuit, tu vois le top 3. Avec ${PLAN_NAME_PRO}, le classement complet." },
  { category: "social", q: "Comment fonctionne le feed ?", a: "Le feed communautaire te permet de partager des posts (texte, photos, sessions, milestones), reagir avec 5 emojis et commenter. Tu choisis la visibilite : Wings seulement ou Public. C'est l'espace pour celebrer tes succes et motiver les autres." },
  { category: "social", q: "Comment lancer un challenge ?", a: `Les challenges (${PLAN_NAME_PRO}) te permettent de defier un wing sur une metrique (approches, closes, sessions) pendant une periode donnee. Le tracking est automatique et en temps reel. L'historique des challenges est conserve.` },

  // ─── PRIVACY ───
  { category: "privacy", q: "Qui peut voir mon profil ?", a: "Tu controles entierement la visibilite de ton profil dans Parametres > Confidentialite. Tu peux choisir d'apparaitre ou non dans la liste de wings, le classement public/wings, et de partager ou non tes stats." },
  { category: "privacy", q: "Mes interactions sont-elles visibles par d'autres ?", a: "Non, tes interactions sont strictement privees. Seuls toi et personne d'autre ne peut voir le detail de tes interactions. Les seules donnees partagees sont celles que tu choisis de publier (feed, profil public)." },
  { category: "privacy", q: "Comment modifier mes parametres de confidentialite ?", a: "Va dans Parametres > Confidentialite ou dans ton Profil > onglet Confidentialite. Tu peux activer/desactiver : apparition dans la liste de wings, classement public, classement wings, partage de stats et d'age." },
  { category: "privacy", q: "Mes donnees sont-elles vendues ?", a: "Jamais. Tes donnees ne sont ni vendues, ni partagees avec des tiers. GameProgress utilise tes donnees uniquement pour te fournir le service (statistiques, classement, coaching IA). Tu peux supprimer toutes tes donnees a tout moment." },
  { category: "privacy", q: "Comment exercer mes droits RGPD ?", a: "Tu peux consulter notre politique RGPD dans les mentions legales. Pour toute demande d'acces, de modification ou de suppression de tes donnees, contacte-nous directement ou utilise l'option de suppression de compte dans les parametres." },
];

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let items = FAQ_DATA;
    if (category !== "all") items = items.filter((f) => f.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    }
    return items;
  }, [search, category]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[var(--primary)] to-[var(--tertiary)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-4px_var(--neon-purple)]">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-2">
          Questions Frequentes
        </h1>
        <p className="text-sm text-[var(--outline)] max-w-xl mx-auto">
          Trouve rapidement des reponses a tes questions sur GameProgress.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une question..."
          className="w-full pl-11 pr-4 py-3 rounded-[16px] glass-card border border-[var(--glass-border)] bg-[var(--surface-high)] text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:border-[var(--primary)] transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-surface)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto no-scrollbar mb-6 -mx-4 px-4">
        <div className="inline-flex gap-1 p-1 rounded-[14px] glass-card border border-[var(--glass-border)]">
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setOpenIdx(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium transition-all whitespace-nowrap ${
                category === c.key
                  ? "bg-[var(--glass-bg)] backdrop-blur-sm text-[var(--on-surface)] shadow-sm border border-[var(--glass-border)]"
                  : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
              </svg>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--outline)]">
          {filtered.length} question{filtered.length !== 1 ? "s" : ""}
          {search && ` pour "${search}"`}
        </p>
        {search && (
          <button onClick={() => { setSearch(""); setCategory("all"); }} className="text-xs text-[var(--primary)] hover:underline">
            Tout afficher
          </button>
        )}
      </div>

      {/* FAQ accordion */}
      <div className="space-y-2">
        {filtered.map((item, idx) => {
          const isOpen = openIdx === idx;
          const cat = FAQ_CATEGORIES.find((c) => c.key === item.category);
          return (
            <div
              key={idx}
              className={`glass-card glass-reflect rounded-[var(--radius-card)] overflow-hidden transition-all duration-200 ${
                isOpen ? "border-[var(--primary)]/20" : ""
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                {/* Category dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.category === "general" ? "bg-[var(--primary)]"
                  : item.category === "account" ? "bg-[var(--tertiary)]"
                  : item.category === "features" ? "bg-emerald-400"
                  : item.category === "gamification" ? "bg-amber-400"
                  : item.category === "premium" ? "bg-[var(--secondary)]"
                  : item.category === "social" ? "bg-cyan-400"
                  : "bg-[var(--outline)]"
                }`} />

                <span className="flex-1 text-sm font-medium text-[var(--on-surface)]">{item.q}</span>

                <svg
                  className={`w-4 h-4 text-[var(--outline)] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-5 pb-4 animate-fade-in">
                  <div className="pl-5 border-l-2 border-[var(--primary)]/20">
                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.a}</p>
                    {category === "all" && cat && (
                      <button
                        onClick={() => { setCategory(item.category); setOpenIdx(null); }}
                        className="mt-2 text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                        </svg>
                        Voir plus dans {cat.label}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-[var(--outline)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-sm text-[var(--outline)]">Aucun resultat pour &quot;{search}&quot;</p>
          <button onClick={() => { setSearch(""); setCategory("all"); }} className="mt-2 text-xs text-[var(--primary)] hover:underline">
            Effacer la recherche
          </button>
        </div>
      )}

      {/* Contact CTA */}
      <div className="mt-10 text-center glass-card glass-reflect rounded-[var(--radius-card)] p-6">
        <p className="text-sm font-semibold text-[var(--on-surface)] mb-1">Tu n&apos;as pas trouve ta reponse ?</p>
        <p className="text-xs text-[var(--outline)] mb-4">Consulte le guide complet ou contacte-nous directement.</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/guide"
            className="px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-sm font-semibold hover:shadow-[0_0_20px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
          >
            Voir le guide
          </Link>
          <Link
            href="/settings"
            className="px-5 py-2.5 rounded-[12px] glass-card border border-[var(--glass-border)] text-sm font-medium text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-all"
          >
            Parametres
          </Link>
        </div>
      </div>
    </div>
  );
}
