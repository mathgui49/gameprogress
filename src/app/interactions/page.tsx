"use client";

import { useInteractions } from "@/hooks/useInteractions";
import { InteractionCard } from "@/components/interactions/InteractionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { IconMessageCircle } from "@/components/ui/Icons";
import Link from "next/link";

export default function InteractionsPage() {
  const { interactions, loaded } = useInteractions();

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const sorted = [...interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] to-[#818cf8] bg-clip-text text-transparent">Interactions</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{interactions.length} interaction{interactions.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/interactions/new"><Button>+ Ajouter</Button></Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<IconMessageCircle size={28} />} title="Aucune interaction" description="Commence par ajouter ta premiere interaction." action={<Link href="/interactions/new"><Button size="lg">Ajouter</Button></Link>} />
      ) : (
        <div className="space-y-2">
          {sorted.map((i, idx) => (
            <div key={i.id} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
              <InteractionCard interaction={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
