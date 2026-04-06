"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PLAN_NAME_FREE, PLAN_NAME_PRO, PRICE_MONTHLY, PRICE_YEARLY,
  PRICE_MONTHLY_EQUIVALENT, YEARLY_DISCOUNT_PERCENT, PLAN_FEATURES,
} from "@/lib/premium";

type BillingCycle = "monthly" | "yearly";

export default function AbonnementPage() {
  const { subscription, isPremium, loaded, checkout, openPortal } = useSubscription();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  // Premium user — show subscription management
  if (isPremium) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent animate-gradient-text">Mon abonnement</span>
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Gère ton abonnement GameMax</p>

        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#c084fc]/[0.03] to-[#f472b6]/[0.03]" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#f472b6] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--on-surface)]">{PLAN_NAME_PRO}</p>
                <Badge className="bg-emerald-400/15 text-emerald-400">Actif</Badge>
              </div>
            </div>

            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-low)]">
                <span className="text-sm text-[var(--on-surface-variant)]">Prochain renouvellement</span>
                <span className="text-sm font-medium text-[var(--on-surface)]">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={openPortal} className="w-full">
                Gérer mon abonnement
              </Button>
              <p className="text-[10px] text-[var(--outline)] text-center">
                Factures, modification du moyen de paiement, changer de plan, annulation...
              </p>
            </div>
          </div>
        </Card>

        {/* Feature list */}
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Tes avantages GameMax</h2>
        <div className="space-y-2">
          {PLAN_FEATURES.filter((f) => f.pro === true || (typeof f.pro === "string" && f.pro !== f.free)).map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#c084fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-[var(--on-surface-variant)]">{f.name}: <span className="text-[var(--on-surface)] font-medium">{typeof f.pro === "boolean" ? "Inclus" : f.pro}</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Free user — show plan comparison
  const categories = [...new Set(PLAN_FEATURES.map((f) => f.category))];
  const categoryLabels: Record<string, string> = {
    tracking: "Suivi", social: "Social", analytics: "Analytics",
    gamification: "Gamification", tools: "Outils",
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent animate-gradient-text">Passe à GameMax</span>
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Débloque tout le potentiel de GameProgress</p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Monthly */}
        <Card className="text-center !p-6 border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-2">Mensuel</p>
          <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{PRICE_MONTHLY}€<span className="text-sm font-normal text-[var(--outline)]">/mois</span></p>
          <Button onClick={() => checkout("monthly")} className="w-full mt-4">Commencer</Button>
        </Card>

        {/* Yearly */}
        <Card className="text-center !p-6 border-[var(--primary)]/30 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-white text-[10px]">-{YEARLY_DISCOUNT_PERCENT}%</Badge>
          </div>
          <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-2">Annuel</p>
          <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{PRICE_MONTHLY_EQUIVALENT}€<span className="text-sm font-normal text-[var(--outline)]">/mois</span></p>
          <p className="text-[10px] text-[var(--outline)] mt-1">Facturé {PRICE_YEARLY}€/an</p>
          <Button onClick={() => checkout("yearly")} className="w-full mt-4">Commencer</Button>
        </Card>
      </div>

      {/* Feature comparison table */}
      <h2 className="text-base font-semibold text-[var(--on-surface)] mb-4 text-center">Comparaison des plans</h2>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[var(--outline)] uppercase tracking-wider mb-3">{categoryLabels[cat] || cat}</h3>
            <div className="space-y-1">
              {PLAN_FEATURES.filter((f) => f.category === cat).map((f) => (
                <div key={f.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface-high)] transition-colors">
                  <span className="text-xs text-[var(--on-surface-variant)] flex-1">{f.name}</span>
                  <div className="flex gap-6 text-xs shrink-0">
                    <span className="w-20 text-center text-[var(--outline)]">
                      {typeof f.free === "boolean" ? (f.free ? "✓" : "—") : f.free}
                    </span>
                    <span className="w-20 text-center text-[var(--primary)] font-medium">
                      {typeof f.pro === "boolean" ? (f.pro ? "✓" : "—") : f.pro}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Column headers (sticky reference) */}
      <div className="flex justify-end gap-6 mt-4 mb-2 px-3">
        <span className="w-20 text-center text-[10px] text-[var(--outline)] font-medium">{PLAN_NAME_FREE}</span>
        <span className="w-20 text-center text-[10px] text-[var(--primary)] font-medium">{PLAN_NAME_PRO}</span>
      </div>
    </div>
  );
}
