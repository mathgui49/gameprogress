"use client";

import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { InteractionForm } from "@/components/interactions/InteractionForm";

export default function NewInteractionPage() {
  const router = useRouter();
  const { add } = useInteractions();

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-manrope)]">
          Nouvelle interaction
        </h1>
      </div>

      <InteractionForm
        onSubmit={(data) => {
          add(data);
          router.push("/interactions");
        }}
      />
    </div>
  );
}
