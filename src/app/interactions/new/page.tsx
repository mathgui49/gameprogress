"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { useGamification } from "@/hooks/useGamification";
import { InteractionForm } from "@/components/interactions/InteractionForm";
import { XP_VALUES } from "@/types";

export default function NewInteractionPage() {
  const router = useRouter();
  const { add } = useInteractions();
  const { add: addContact } = useContacts();
  const { allSessions, addInteraction: linkToSession } = useSessions();
  const { addXP, updateStreak } = useGamification();

  // Auto-detect active session: session between -30min and +4h from now
  const autoSession = useMemo(() => {
    const now = Date.now();
    return allSessions.find((s) => {
      const sessionTime = new Date(s.date).getTime();
      return sessionTime >= now - 30 * 60 * 1000 && sessionTime <= now + 4 * 3600 * 1000;
    }) ?? null;
  }, [allSessions]);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[var(--on-surface)]/40 hover:text-[var(--on-surface)]/60 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <h1 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight font-[family-name:var(--font-manrope)]">
          Nouvelle interaction
        </h1>
        {autoSession && (
          <p className="text-xs text-[var(--primary)] mt-1">
            Rattachée automatiquement à : {autoSession.title || "Session en cours"}
          </p>
        )}
      </div>

      <InteractionForm
        defaultSessionId={autoSession?.id}
        defaultLocation={autoSession?.location}
        onSubmit={async (data) => {
          const interaction = await add(data);
          // Auto-link to session if detected
          if (autoSession) {
            await linkToSession(autoSession.id, interaction.id);
          }
          // XP rewards
          addXP(XP_VALUES.interaction_created, "Interaction créée");
          if (data.note) addXP(XP_VALUES.interaction_with_note, "Note ajoutée");
          if (data.result === "close") addXP(XP_VALUES.close, "Close !");
          updateStreak();
          // Auto-create contact on close (pipeline)
          if (data.result === "close") {
            if (data.contactMethod && data.contactValue) addXP(XP_VALUES.contact_added, "Contact ajouté");
            await addContact({
              firstName: data.firstName || data.memorableElement || "Inconnue",
              sourceInteractionId: interaction.id,
              method: data.contactMethod || "other",
              methodValue: data.contactValue || "",
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
