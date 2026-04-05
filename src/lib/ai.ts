import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface CoachingInput {
  totalInteractions: number;
  closeRate: number;
  avgFeeling: number;
  avgConfidence: number;
  streak: number;
  level: number;
  /** Breakdown by type */
  typeBreakdown: { direct: number; indirect: number; situational: number };
  /** Close rate per type */
  closeRateByType: { direct: number; indirect: number; situational: number };
  /** Top objections encountered */
  topObjections: { label: string; count: number }[];
  /** Feeling trend (last 4 weeks averages) */
  feelingTrend: number[];
  /** Confidence trend (last 4 weeks averages) */
  confidenceTrend: number[];
  /** Recent interactions summary (last 10) */
  recentSummaries: {
    type: string;
    result: string;
    feeling: number;
    confidence: number;
    objection?: string;
    duration: string;
  }[];
}

const SYSTEM_PROMPT = `Tu es un coach en social skills / séduction intégré à l'app GameProgress. Tu analyses les données d'un utilisateur et tu donnes des conseils personnalisés, concrets et actionnables.

Ton style :
- Tutoiement, ton direct et bienveillant (comme un bon pote qui te challenge)
- Pas de blabla générique — chaque conseil doit être ancré dans les données
- Structure ta réponse avec des sections claires
- Utilise des emojis avec parcimonie pour la lisibilité
- Sois honnête sur les points faibles mais toujours constructif
- Maximum 600 mots

Structure ta réponse EXACTEMENT ainsi (en markdown) :

## Diagnostic

Un paragraphe résumant la situation globale de l'utilisateur : ses forces, ses faiblesses, et où il en est dans sa progression.

## Ce qui marche

2-3 points positifs concrets basés sur les données (type d'approche avec le meilleur close rate, tendances à la hausse, etc.)

## Axes d'amélioration

2-3 points à travailler avec des conseils CONCRETS et actionnables. Pas de "sois plus confiant" — plutôt "essaie X technique dans Y situation".

## Mission de la semaine

UNE mission précise, mesurable, adaptée au niveau de l'utilisateur. Exemple : "Fais 3 approches directes dans un café cette semaine" ou "Lors de tes 5 prochaines interactions, essaie la technique X".`;

export async function generateCoaching(input: CoachingInput): Promise<string> {
  const userMessage = buildUserMessage(input);

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text?.text ?? "Impossible de générer l'analyse.";
}

function buildUserMessage(d: CoachingInput): string {
  const lines = [
    `## Données de l'utilisateur`,
    ``,
    `**Stats globales :** ${d.totalInteractions} interactions | Close rate ${d.closeRate}% | Ressenti moyen ${d.avgFeeling}/10 | Confiance moyenne ${d.avgConfidence}/10`,
    `**Progression :** Niveau ${d.level} | Streak actuel ${d.streak} jours`,
    ``,
    `**Répartition par type :**`,
    `- Direct : ${d.typeBreakdown.direct} interactions (close rate ${d.closeRateByType.direct}%)`,
    `- Indirect : ${d.typeBreakdown.indirect} interactions (close rate ${d.closeRateByType.indirect}%)`,
    `- Situationnel : ${d.typeBreakdown.situational} interactions (close rate ${d.closeRateByType.situational}%)`,
    ``,
  ];

  if (d.topObjections.length > 0) {
    lines.push(`**Objections les plus fréquentes :**`);
    d.topObjections.forEach((o) => lines.push(`- ${o.label} (${o.count}x)`));
    lines.push(``);
  }

  if (d.feelingTrend.length > 0) {
    lines.push(`**Tendance ressenti (4 dernières semaines) :** ${d.feelingTrend.map((v) => v.toFixed(1)).join(" → ")}`);
  }
  if (d.confidenceTrend.length > 0) {
    lines.push(`**Tendance confiance (4 dernières semaines) :** ${d.confidenceTrend.map((v) => v.toFixed(1)).join(" → ")}`);
  }

  if (d.recentSummaries.length > 0) {
    lines.push(``, `**10 dernières interactions :**`);
    d.recentSummaries.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.type} | ${r.result} | ressenti ${r.feeling}/10 | confiance ${r.confidence}/10 | durée ${r.duration}${r.objection ? ` | objection: ${r.objection}` : ""}`);
    });
  }

  lines.push(``, `Analyse ces données et donne-moi un coaching personnalisé.`);
  return lines.join("\n");
}
