"use client";

import { useState } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { InteractionCard } from "@/components/interactions/InteractionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function InteractionsPage() {
  const { interactions, loaded } = useInteractions();
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const sorted = [...interactions].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return sortOrder === "newest" ? db - da : da - db;
  });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-1">Interactions</h1>
          <p className="text-sm text-[#adaaab]">{interactions.length} interaction{interactions.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/interactions/new"><Button>+ Ajouter</Button></Link>
      </div>

      {interactions.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-[#131314] rounded-xl w-fit mb-4">
          {(["newest", "oldest"] as const).map((o) => (
            <button key={o} onClick={() => setSortOrder(o)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === o ? "bg-white/[0.06] text-white" : "text-[#484849] hover:text-[#adaaab]"}`}>
              {o === "newest" ? "Recentes" : "Anciennes"}
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon="💬" title="Aucune interaction" description="Commence par ajouter ta premiere interaction." action={<Link href="/interactions/new"><Button size="lg">Ajouter</Button></Link>} />
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
