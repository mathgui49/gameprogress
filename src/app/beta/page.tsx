"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PLAN_NAME_FREE, PLAN_NAME_PRO, PLAN_FEATURES,
} from "@/lib/premium";

export default function BetaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isPremium, isBeta, loaded, refresh } = useSubscription();

  const [spots, setSpots] = useState<{ total: number; taken: number; remaining: number } | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/beta").then((r) => r.json()).then(setSpots);
  }, []);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    setError("");
    const res = await fetch("/api/beta", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      setJoining(false);
      return;
    }
    setSuccess(true);
    setJoining(false);
    refresh();
    // Refresh spots
    fetch("/api/beta").then((r) => r.json()).then(setSpots);
  };

  const categories = [...new Set(PLAN_FEATURES.map((f) => f.category))];
  const categoryLabels: Record<string, string> = {
    tracking: "Suivi", social: "Social", analytics: "Analytics",
    gamification: "Gamification", tools: "Outils",
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c084fc]/10 text-[#c084fc] text-xs font-medium mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          Programme Beta Testeurs
        </div>
        <h1 className="text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-3">
          <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">Deviens Beta Testeur</span>
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)] max-w-md mx-auto">
          Tu as été invité à rejoindre le programme bêta de GameProgress. Accède à toutes les fonctionnalités GameMax pendant 1 an, gratuitement.
        </p>
      </div>

      {/* Spots counter */}
      {spots && (
        <Card className="text-center !p-6 mb-8 border-[var(--primary)]/20">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--primary)]">{spots.remaining}</p>
              <p className="text-xs text-[var(--on-surface-variant)]">places restantes</p>
            </div>
            <div className="w-px h-12 bg-[var(--border)]" />
            <div>
              <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{spots.total}</p>
              <p className="text-xs text-[var(--on-surface-variant)]">places totales</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-500"
              style={{ width: `${(spots.taken / spots.total) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--outline)] mt-2">{spots.taken}/{spots.total} beta testeurs inscrits</p>
        </Card>
      )}

      {/* What you get */}
      <Card className="!p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c084fc]/[0.03] to-[#f472b6]/[0.03]" />
        <div className="relative">
          <h2 className="text-lg font-semibold text-[var(--on-surface)] mb-2">Ce que tu obtiens</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="text-sm font-medium text-[var(--on-surface)]">Accès complet à GameMax pendant 1 an</p>
                <p className="text-xs text-[var(--outline)]">Toutes les fonctionnalités premium, sans payer</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="text-sm font-medium text-[var(--on-surface)]">Influence le produit</p>
                <p className="text-xs text-[var(--outline)]">Tes retours et suggestions sont pris en compte en priorité</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="text-sm font-medium text-[var(--on-surface)]">Accès anticipé aux nouvelles features</p>
                <p className="text-xs text-[var(--outline)]">Tu seras le premier à tester les nouveautés</p>
              </div>
            </li>
          </ul>
        </div>
      </Card>

      {/* What we expect */}
      <Card className="!p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--on-surface)] mb-2">Ce qu&apos;on attend de toi</h2>
        <ul className="space-y-2 text-sm text-[var(--on-surface-variant)]">
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">1.</span> Utilise l&apos;app régulièrement et explore toutes les features
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">2.</span> Signale les bugs, problèmes d&apos;UX ou idées d&apos;amélioration
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">3.</span> Donne ton avis honnête — positif ou négatif, tout est utile
          </li>
        </ul>
      </Card>

      {/* Plan comparison */}
      <h2 className="text-base font-semibold text-[var(--on-surface)] mb-1 text-center">Ce à quoi tu vas avoir accès</h2>
      <p className="text-xs text-[var(--outline)] text-center mb-4">Au lieu de 6.99€/mois, c&apos;est offert</p>

      <div className="flex justify-end gap-6 mb-2 px-3">
        <span className="w-20 text-center text-[10px] text-[var(--outline)] font-medium">{PLAN_NAME_FREE}</span>
        <span className="w-20 text-center text-[10px] text-[var(--primary)] font-medium">{PLAN_NAME_PRO}</span>
      </div>

      <div className="space-y-6 mb-8">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[var(--outline)] uppercase tracking-wider mb-3">{categoryLabels[cat] || cat}</h3>
            <div className="space-y-1">
              {PLAN_FEATURES.filter((f) => f.category === cat).map((f) => (
                <div key={f.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface-high)] transition-colors">
                  <span className="text-xs text-[var(--on-surface-variant)] flex-1">{f.name}</span>
                  <div className="flex gap-6 text-xs shrink-0">
                    <span className="w-20 text-center text-[var(--outline)]">
                      {typeof f.free === "boolean" ? (f.free ? "\u2713" : "\u2014") : f.free}
                    </span>
                    <span className="w-20 text-center text-[var(--primary)] font-medium">
                      {typeof f.pro === "boolean" ? (f.pro ? "\u2713" : "\u2014") : f.pro}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center space-y-3">
        {success ? (
          <Card className="!p-6 border-emerald-400/30">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-400/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-semibold text-emerald-400">Bienvenue dans le programme beta !</p>
              <p className="text-sm text-[var(--on-surface-variant)]">Tu as maintenant accès à toutes les fonctionnalités GameMax. Bonne game !</p>
              <Button onClick={() => router.push("/")}>Aller au dashboard</Button>
            </div>
          </Card>
        ) : isBeta ? (
          <Card className="!p-6 border-[var(--primary)]/30">
            <p className="text-sm text-[var(--on-surface-variant)]">Tu fais déjà partie du programme bêta !</p>
            <Button onClick={() => router.push("/beta/programme")} className="mt-3">Voir mon programme</Button>
          </Card>
        ) : isPremium ? (
          <Card className="!p-6">
            <p className="text-sm text-[var(--on-surface-variant)]">Tu as déjà un abonnement GameMax actif.</p>
          </Card>
        ) : !session ? (
          <Card className="!p-6">
            <p className="text-sm text-[var(--on-surface-variant)] mb-3">Connecte-toi pour rejoindre le programme beta</p>
            <Button onClick={() => router.push("/login")}>Se connecter</Button>
          </Card>
        ) : spots?.remaining === 0 ? (
          <Card className="!p-6 border-[#fb7185]/30">
            <p className="text-sm text-[#fb7185]">Le programme bêta est complet. Toutes les places ont été prises.</p>
          </Card>
        ) : (
          <>
            {error && <p className="text-sm text-[#fb7185]">{error}</p>}
            <Button size="lg" onClick={handleJoin} disabled={joining || !loaded}>
              {joining ? "Inscription..." : "Rejoindre le programme beta"}
            </Button>
            <p className="text-[10px] text-[var(--outline)]">Aucun paiement requis. Accès GameMax pendant 1 an.</p>
          </>
        )}
      </div>
    </div>
  );
}
