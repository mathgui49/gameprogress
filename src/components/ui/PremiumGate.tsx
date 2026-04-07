"use client";

import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_NAME_PRO, PRICE_MONTHLY } from "@/lib/premium";

interface PremiumGateProps {
  children: React.ReactNode;
  /** What to show when user is not premium. Defaults to built-in upgrade card */
  fallback?: React.ReactNode;
  /** Feature name for contextual messaging */
  feature?: string;
}

/**
 * Wraps premium-only content. Shows children if user is GameMax,
 * otherwise shows an upgrade prompt.
 */
export function PremiumGate({ children, fallback, feature }: PremiumGateProps) {
  const { isPremium, loaded } = useSubscription();

  if (!loaded) return null;
  if (isPremium) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return <UpgradeCard feature={feature} />;
}

/**
 * Inline upgrade card shown when a free user hits a premium feature.
 */
export function UpgradeCard({ feature, compact }: { feature?: string; compact?: boolean }) {
  const router = useRouter();
  const goToPlans = () => router.push("/abonnement");

  if (compact) {
    return (
      <button
        onClick={goToPlans}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-semibold hover:shadow-[0_0_16px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Passer {PLAN_NAME_PRO}
      </button>
    );
  }

  return (
    <div className="relative rounded-[18px] bg-gradient-to-br from-[var(--primary)]/5 to-[var(--secondary)]/5 border border-[var(--primary)]/15 p-6 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/3 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-4px_var(--neon-purple)]">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h3 className="text-base font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-1.5">
          {feature ? `${feature} — ` : ""}Fonctionnalité {PLAN_NAME_PRO}
        </h3>
        <p className="text-sm text-[var(--outline)] mb-4">
          Débloque cette fonctionnalité et bien plus avec {PLAN_NAME_PRO} pour seulement {PRICE_MONTHLY}&euro;/mois.
          <br />
          <span className="text-[var(--on-surface-variant)] font-medium">Moins cher qu&apos;un kebab.</span>
        </p>
        <button
          onClick={goToPlans}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-sm font-semibold hover:shadow-[0_0_24px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Passer à {PLAN_NAME_PRO}
        </button>
        <p className="text-[10px] text-[var(--outline-variant)] mt-3">Satisfait ou remboursé 14 jours</p>
      </div>
    </div>
  );
}

/**
 * A limit-reached banner that shows when user hits a free limit.
 */
export function LimitReachedBanner({
  current,
  limit,
  itemName,
}: {
  current: number;
  limit: number;
  itemName: string;
}) {
  const router = useRouter();
  const goToPlans = () => router.push("/abonnement");

  if (current < limit) return null;

  return (
    <div className="rounded-[14px] bg-gradient-to-r from-[var(--primary)]/8 to-[var(--secondary)]/8 border border-[var(--primary)]/15 p-4 flex flex-col sm:flex-row items-center gap-4">
      <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shrink-0 shadow-[0_0_12px_-4px_var(--neon-purple)]">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--on-surface)]">
          Tu as atteint ta limite de {limit} {itemName} ce mois-ci
        </p>
        <p className="text-xs text-[var(--outline)] mt-0.5">
          Passe à {PLAN_NAME_PRO} pour un accès illimité — {PRICE_MONTHLY}&euro;/mois
        </p>
      </div>
      <button
        onClick={goToPlans}
        className="shrink-0 px-4 py-2 rounded-[10px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-semibold hover:shadow-[0_0_16px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
      >
        Passer {PLAN_NAME_PRO}
      </button>
    </div>
  );
}

/**
 * Small badge to show on locked features in nav/lists
 */
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[6px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[8px] font-bold text-white uppercase tracking-wider ${className}`}>
      {PLAN_NAME_PRO}
    </span>
  );
}

/**
 * Blurred overlay for premium content previews (analytics, leaderboard, etc.)
 */
export function BlurredPremium({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const { isPremium, loaded } = useSubscription();
  const router = useRouter();
  const goToPlans = () => router.push("/abonnement");

  if (!loaded) return null;
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-[6px] pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]/60 backdrop-blur-[2px] rounded-[14px]">
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center mx-auto mb-3 shadow-[0_0_16px_-4px_var(--neon-purple)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--on-surface)] mb-1">{feature || "Contenu"} {PLAN_NAME_PRO}</p>
          <p className="text-xs text-[var(--outline)] mb-3">Seulement {PRICE_MONTHLY}&euro;/mois</p>
          <button
            onClick={goToPlans}
            className="px-5 py-2 rounded-[10px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-semibold hover:shadow-[0_0_16px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
          >
            Débloquer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard upgrade banner — shown at top of dashboard for free users
 */
export function DashboardUpgradeBanner() {
  const { isPremium, loaded } = useSubscription();
  const router = useRouter();
  const goToPlans = () => router.push("/abonnement");

  if (!loaded || isPremium) return null;

  return (
    <div className="rounded-[16px] bg-gradient-to-r from-[var(--primary)]/10 via-[var(--secondary)]/8 to-[var(--primary)]/10 border border-[var(--primary)]/15 p-4 flex flex-col sm:flex-row items-center gap-4 mb-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_var(--neon-purple)]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">
            Débloque tout le potentiel de GameProgress avec {PLAN_NAME_PRO}
          </p>
          <p className="text-xs text-[var(--outline)] mt-0.5">
            IA coaching, analytics avancés, wings illimités et plus — {PRICE_MONTHLY}&euro;/mois, moins cher qu&apos;un kebab
          </p>
        </div>
      </div>
      <button
        onClick={goToPlans}
        className="shrink-0 px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-sm font-semibold hover:shadow-[0_0_20px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
      >
        Passer à {PLAN_NAME_PRO}
      </button>
    </div>
  );
}
