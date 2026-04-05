"use client";

import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useGamification } from "@/hooks/useGamification";
import { InteractionForm } from "@/components/interactions/InteractionForm";
import { XP_VALUES } from "@/types";

export default function NewInteractionPage() {
  const router = useRouter();
  const { add } = useInteractions();
  const { add: addContact } = useContacts();
  const { addXP, updateStreak } = useGamification();

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
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
          const interaction = add(data);
          // XP rewards
          addXP(XP_VALUES.interaction_created, "Interaction cree");
          if (data.note) addXP(XP_VALUES.interaction_with_note, "Note ajoutee");
          if (data.result === "close") addXP(XP_VALUES.close, "Close !");
          if (data.contactMethod && data.contactValue) addXP(XP_VALUES.contact_added, "Contact ajoute");
          updateStreak();
          // Auto-create contact if close + contact info provided
          if (data.result === "close" && data.contactMethod && data.contactValue) {
            addContact({
              firstName: data.firstName || data.memorableElement || "Inconnue",
              sourceInteractionId: interaction.id,
              method: data.contactMethod,
              methodValue: data.contactValue,
              status: "new",
              tags: [],
              notes: "",
            });
          }
          router.push("/interactions");
        }}
      />
    </div>
  );
}
