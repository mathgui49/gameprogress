"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function BetaProgrammePage() {
  const router = useRouter();
  const { subscription, isPremium, isBeta, loaded } = useSubscription();
  const [spots, setSpots] = useState<{ total: number; taken: number; remaining: number } | null>(null);

  useEffect(() => {
    fetch("/api/beta").then((r) => r.json()).then(setSpots);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  // Not a beta tester — redirect
  if (!isBeta) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in text-center">
        <p className="text-sm text-[var(--on-surface-variant)] mb-4">Cette page est réservée aux bêta testeurs.</p>
        <Button onClick={() => router.push("/")}>Retour au dashboard</Button>
      </div>
    );
  }

  const expiryDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#f472b6] flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">Programme Beta</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-emerald-400/15 text-emerald-400">Beta Testeur</Badge>
            <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">GameMax</Badge>
          </div>
        </div>
      </div>

      {/* Status card */}
      <Card className="!p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c084fc]/[0.03] to-[#f472b6]/[0.03]" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--on-surface-variant)]">Statut</span>
            <span className="text-sm font-medium text-emerald-400">Actif</span>
          </div>
          {expiryDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Accès GameMax jusqu&apos;au</span>
              <span className="text-sm font-medium text-[var(--on-surface)]">{expiryDate}</span>
            </div>
          )}
          {spots && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Beta testeurs inscrits</span>
              <span className="text-sm font-medium text-[var(--on-surface)]">{spots.taken}/{spots.total}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Feedback section */}
      <Card className="!p-5 mb-6">
        <h2 className="text-base font-semibold text-[var(--on-surface)] mb-3">Tes retours comptent</h2>
        <p className="text-sm text-[var(--on-surface-variant)] mb-4">
          En tant que bêta testeur, chaque retour que tu fais aide à améliorer GameProgress pour tout le monde. N&apos;hésite pas à signaler :
        </p>
        <ul className="space-y-2 text-sm text-[var(--on-surface-variant)]">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#fb7185] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 3.31M12 12.75c-2.883 0-5.647.508-8.208 1.44.421 1.14.933 2.247 1.153 3.31" /></svg>
            Bugs et erreurs rencontrés
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
            Idées de fonctionnalités
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            Suggestions d&apos;amélioration UX
          </li>
        </ul>
      </Card>

      {/* Reminder */}
      <div className="text-center">
        <p className="text-xs text-[var(--outline)]">
          Merci de faire partie de l&apos;aventure GameProgress !
        </p>
      </div>
    </div>
  );
}
