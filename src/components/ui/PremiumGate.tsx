"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/Button";

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumGate({ children, fallback }: PremiumGateProps) {
  const { isPremium, loaded, checkout } = useSubscription();

  if (!loaded) return null;
  if (isPremium) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 px-4 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#f472b6]/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--on-surface)] mb-1">Fonctionnalité Premium</p>
        <p className="text-xs text-[var(--on-surface-variant)]">Passe à Premium pour débloquer cette fonctionnalité.</p>
      </div>
      <Button onClick={checkout}>Passer Premium</Button>
    </div>
  );
}
