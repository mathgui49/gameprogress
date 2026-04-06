"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const TIPS = [
  // ─── UMP: Approche ─────────────────────────────────────
  "Ouvre de face, fort et direct pour capter l'attention des groupes en mouvement.",
  "Ne danse jamais collé derrière une fille sur la piste — ouvre-la en face.",
  "Reformule ton anxiété d'approche en excitation pour avancer malgré la peur.",
  "Ne limite pas tes approches aux filles parfaites : dis bonjour à tout le monde.",
  "Expose-toi progressivement à la peur comme en thérapie d'exposition cognitive.",
  "Clarifie ton intention rapidement après un opener indirect pour éviter la confusion.",
  "Transitionne vers un compliment sincère après avoir capté l'attention du groupe.",
  "Ouvre les sets assis en t'asseyant directement, comme si tu étais en retard.",
  "Utilise l'effet de familiarité : réouvrir une fille augmente souvent l'attraction.",
  "Quand tu rouvres, dis 'Arrête de me suivre partout' avec un sourire confiant.",
  "Rouvre une fille plus tard dans la soirée avec du sarcasme confiant.",
  "Ne reste jamais accroché trop longtemps à un set qui ne réagit pas : souris et pars.",
  "Varie tes approches (direct, indirect, situationnel) pour développer ta polyvalence.",

  // ─── UMP: Conversation & DHV ───────────────────────────
  "Utilise des boucles ouvertes : donne 20% de l'info pour créer du mystère.",
  "Réponds partiellement aux questions et laisse le silence créer la curiosité.",
  "Décris ton métier de façon captivante et mystérieuse, jamais technique.",
  "Annonce 'Il y a trois choses que j'aime chez toi' puis n'en donne que deux.",
  "Coupe-la quand elle se justifie pour créer une boucle ouverte inversée.",
  "Prépare cinq réponses DHV aux questions courantes : métier, origine, âge, passions.",
  "Raconte ton voyage avec des détails aventuriers quand elle mentionne son pays d'origine.",
  "Utilise la routine du job en créant du mystère avant de révéler ton métier.",
  "Réponds 'Vieux' quand elle demande ton âge, puis laisse le silence faire le travail.",
  "Dis 'C'est compliqué' sur ta localisation pour générer un investissement immédiat.",
  "Ne ferme une boucle ouverte que pour lever une objection ou créer de la confiance.",

  // ─── UMP: Qualification & Compliance ───────────────────
  "Fais-la se qualifier en lui demandant ce qu'elle a de spécial au-delà du physique.",
  "Utilise la règle 80/20 : donne-lui 80% de ce qu'elle veut, garde 20% en suspens.",
  "Ajoute toujours 'parce que' avant une demande pour augmenter la compliance.",
  "Présume toujours sa compliance : lève-toi et commence à marcher sans demander.",
  "Hoche la tête et laisse un silence après ta question pour obtenir plus d'investissement.",
  "Plus elle fournit d'efforts pour te gagner, plus elle rationalisera son attraction.",
  "Fais ses engagements devant ses amies pour renforcer sa cohérence comportementale.",
  "Fais-la s'engager publiquement à être indépendante pour faciliter l'isolation.",
  "Utilise le mot 'parce que' même avec une raison banale pour booster la compliance.",

  // ─── UMP: Frame & Shit Tests ───────────────────────────
  "Passe les shit tests avec 'Agree and Amplify' : exagère tellement que c'est absurde.",
  "Utilise l'auto-dérision face aux shit tests pour montrer une confiance profonde.",
  "Reste non-réactif émotionnellement face aux piques : moins tu investis, plus tu vaux.",
  "Distingue un shit test (ton joueur) d'une vraie préoccupation (ton inquiet).",
  "Après un neg trop fort, excuse-toi en la recadrant comme celle qui a surréagi.",
  "Choisis un méta-frame par interaction et oriente toute ton énergie dans cette direction.",
  "Tu es le prix : elle entre dans ton univers, pas l'inverse.",
  "Cadre-la comme cherchant l'attention masculine si elle regarde autour d'elle.",
  "Si elle te rejette, sous-entends qu'elle est superficielle pour la faire se défendre.",
  "Dis 'Si tu me détestes, dis-le juste' pour neutraliser ses objections soft.",
  "Cadre ses excuses comme un jeu manipulateur pour la pousser à être honnête.",
  "Utilise le frame 'indépendance' pour la dissocier de la pression de ses amies.",

  // ─── UMP: Faux DQ & Negs ──────────────────────────────
  "Utilise un faux disqualificateur pour réduire la pression du 'il me drague'.",
  "Dis 'Ça ne marchera jamais entre nous' en souriant pour créer du défi.",
  "Indique son désintérêt temporaire avec 'Tu es trop gentille fille pour moi.'",
  "N'enchaîne jamais trop de negs : tu risques de la rendre inaccessible à toi.",
  "Quand tu DHV trop, qualifie-la pour redevenir accessible.",

  // ─── UMP: Escalade & Sexualisation ─────────────────────
  "Alterne pression sexuelle on et off pour maintenir la tension sans déclencher sa défense.",
  "Ne pousse jamais l'escalade sexuelle en continu : recule régulièrement d'un cran.",
  "Utilise le baiting pour la sexualisation : 'Je ne devrais probablement pas te dire ça.'",
  "Fais-la accepter d'être open-minded avant d'amener la conversation vers le sexe.",
  "Commence léger en escalade physique puis observe sa réaction avant d'intensifier.",
  "Cadre la conversation sexuelle comme un signe de maturité et d'intelligence émotionnelle.",
  "Crée de la tension avec du push/pull tout au long de l'interaction.",
  "Dose les signaux sexuels verbalement et non-verbalement selon sa réceptivité.",
  "Utilise la Lip Routine : 'Arrête de fixer mes lèvres !' pour créer la tension du baiser.",
  "Penche-toi en avant puis en arrière pour lui offrir l'occasion d'escalader.",
  "Cadre-la toujours comme celle qui escalade sur toi, pas l'inverse.",
  "Dis 'Tu me rends fou' sur un ton joueur pour renforcer le frame qu'elle te poursuit.",
  "Dis 'Arrête !' sur un ton joueur après l'avoir embrassée pour inverser le script.",
  "Montre la routine 'Ralentis' en caressant son bras lentement pour démontrer la présence.",
  "Commence le dirty talk par des compliments avant d'introduire des commandes.",
  "Sois descriptif et sensoriel dans le dirty talk pour stimuler son imagination.",
  "Prends sa main et fais-lui une petite tape joueuse comme métaphore de dominance.",

  // ─── UMP: Preuve sociale & Isolation ───────────────────
  "Utilise la preuve sociale en sous-entendant que d'autres filles acceptent tes invitations.",
  "Lock-in en t'appuyant contre le bar pour montrer que tu es ancré et à l'aise.",
  "Isole-la du groupe avec une raison simple : 'Viens, on prend un verre au bar.'",
  "Fusionne tes sets en présentant une fille à un nouveau groupe comme ton 'amie'.",
  "Demande à une fille non-disponible de t'aider à ouvrir le prochain set.",
  "Gère les amies protectrices en leur montrant que tu n'essaies pas de conclure.",
  "Utilise le favoritisme d'endogroupe : crée des points communs avec elle.",

  // ─── UMP: Pull & Logistique ────────────────────────────
  "Seed le pull tôt dans l'interaction avec des mentions subtiles de chez toi.",
  "Pendant le pull, parle en continu pour occuper son esprit et éviter ses doutes.",
  "Ne mentionne jamais ses amies, son travail ou la logistique pendant le pull.",
  "Propose trois options dont une leurre pour orienter son choix vers chez toi.",
  "Utilise le baby-stepping : propose d'abord manger, puis redirige vers chez toi.",
  "Quand elle veut prévenir ses amies, dis-lui d'envoyer un message en marchant.",
  "Fais du screening logistique tôt : 'T'es venue comment ? Tu habites loin ?'",
  "Vole ses objections avant qu'elle les formule pour les neutraliser à l'avance.",
  "Propose 'Juste un verre, je dois me lever tôt' pour voler son objection de temps.",
  "Prépare ta logistique chez toi avant de sortir : vin, musique, ambiance prête.",
  "Argumente contre toi-même au lieu de contre elle pour gérer les objections.",
  "Quand tu préviens ses amies, adresse-toi à la plus sympathique en la tenant par la main.",
  "Ne prends jamais la décision de partir sans être déjà positionné près de la sortie.",
  "Cadre 'rentrer tôt' comme immature pour encourager la soirée tardive.",
  "Dis 'Il est encore super tôt' quand elle montre des signes de vouloir partir.",

  // ─── UMP: Inner Game & Mindset ─────────────────────────
  "Après chaque rejet, identifie une seule chose que tu aurais pu améliorer.",
  "Le rejet ne concerne pas toi, mais les données que tu as présentées en 15 secondes.",
  "Traite-toi comme ton meilleur ami : célèbre tes efforts après chaque interaction.",
  "Prends l'entière responsabilité de chaque interaction qui échoue, sans excuses.",
  "Concentre-toi sur le processus d'apprentissage plutôt que sur les résultats immédiats.",
  "Adopte un growth mindset : les compétences sociales se développent par la pratique.",
  "Reformule 'Je ne peux pas' en opportunité dans ton vocabulaire quotidien.",
  "Concentre-toi sur ce que tu contrôles et accepte ce que tu ne peux pas changer.",
  "Note une chose bien faite après chaque interaction pour créer une spirale positive.",
  "Rappelle-toi tes meilleures interactions passées pour renforcer ta confiance.",
  "Rappelle-toi ton 'pourquoi' profond quand l'anxiété d'approche frappe.",
  "Utilise la peur de passer à côté (FOMO) comme carburant pour approcher.",
  "Utilise la règle du campsite : elle doit se sentir mieux après t'avoir rencontré.",
  "Seul le mec de haute valeur peut se moquer de lui-même : auto-dérision stratégique.",

  // ─── UMP: Lifestyle & Routine ──────────────────────────
  "Sors au moins trois soirs par semaine pour maintenir le momentum social.",
  "Fais du daygame spontané en semaine pour générer plus de leads en parallèle.",
  "Porte un parfum signature : c'est le booster de première impression le plus sous-estimé.",
  "Habille-toi correctement pour le dress code du club avant même d'y entrer.",
  "Entoure-toi de wings qui suivent le même parcours d'apprentissage que toi.",
  "Poste tes field reports dans un groupe de wings pour obtenir du feedback structuré.",
  "Leader l'interaction : propose, décide et avance sans hésiter.",
  "Écris des objectifs précis en game avec une date limite et lis-les chaque jour.",
  "Rédige une liste des traits de ta femme idéale pour maintenir des standards élevés.",
  "Screen rapidement une fille seule pour prédire les interruptions.",
  "Expose-toi volontairement à des situations sociales difficiles pour progresser.",
  "Ne change jamais de sujet quand elle résiste : recule d'un cran puis reviens.",

  // ─── GameProgress: Fonctionnalités ─────────────────────
  "Utilise le journal pour capturer tes émotions après chaque session.",
  "Fixe-toi une mission simple pour cette semaine — la régularité bat l'intensité.",
  "Reviens voir ta progression chaque semaine pour mesurer ton évolution.",
  "Les wings sont plus efficaces que le solo — invite un ami via la page Wings !",
  "Définis des objectifs avant chaque session pour rester concentré.",
  "Un streak de 7 jours te donne un bonus XP de +40% sur les interactions.",
  "Fais un débrief écrit après chaque sortie dans le journal pour structurer ta progression.",
  "Log chaque interaction même ratée : les données sont la clé de la progression.",
  "Utilise les tags dans le journal pour retrouver facilement tes meilleures sessions.",
  "Consulte tes rapports hebdomadaires pour identifier tes patterns de succès.",
  "Déplace tes contacts dans le pipeline pour visualiser ta progression en temps réel.",
  "Active les notifications push pour ne jamais oublier tes missions en cours.",
  "Ajoute des rappels sur tes contacts pour relancer au bon moment.",
  "Compare tes stats mensuelles dans la page Progression pour voir l'évolution.",
  "Utilise le mode hors-ligne pour logger tes interactions même sans réseau.",
  "Envoie un ping à tes wings quand tu sors pour maximiser tes chances en groupe.",
  "Archive les contacts inactifs depuis 14+ jours pour garder ton pipeline propre.",
  "Utilise la recherche globale pour retrouver n'importe quel contact ou interaction.",
  "Complète ton profil pour débloquer les fonctionnalités sociales et les messages.",
  "Essaie la vue Kanban dans le pipeline pour visualiser chaque étape du funnel.",
];

// Shuffle once on mount for variety
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function TipsBar() {
  const pathname = usePathname();
  const [tips] = useState(() => shuffleArray(TIPS));
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % tips.length);
        setFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  // Hide on login/landing
  if (pathname === "/login" || pathname === "/landing") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--surface-low)] border-b border-[var(--border)]">
      <div className="w-6 h-6 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className={`flex-1 text-xs text-[var(--on-surface-variant)] transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}>
        {tips[idx]}
      </p>
    </div>
  );
}
