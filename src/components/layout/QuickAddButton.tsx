"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useGamification } from "@/hooks/useGamification";
import type { ApproachType, ResultType, ContactMethod } from "@/types";
import { XP_VALUES } from "@/types";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { Tooltip } from "@/components/ui/Tooltip";

const ACTIONS = [
  { href: "/interactions/new", label: "Interaction (complet)", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/contacts?new=1", label: "Contact", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  { href: "/journal?new=1", label: "Journal", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { href: "/sessions/new", label: "Session", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/missions?new=1", label: "Mission", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
];

export function QuickAddButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const { add } = useInteractions();
  const { addXP, updateStreak } = useGamification();

  if (pathname === "/login" || pathname === "/landing") return null;
  const { add: addContact } = useContacts();

  const [qName, setQName] = useState("");
  const [qLocation, setQLocation] = useState("");
  const [qType, setQType] = useState<ApproachType>("direct");
  const [qResult, setQResult] = useState<ResultType>("neutral");
  const [qNote, setQNote] = useState("");
  const [qContactMethod, setQContactMethod] = useState<ContactMethod | null>(null);
  const [qContactValue, setQContactValue] = useState("");
  const [saved, setSaved] = useState(false);

  const resetQuick = () => {
    setQName(""); setQLocation(""); setQType("direct"); setQResult("neutral"); setQNote("");
    setQContactMethod(null); setQContactValue("");
  };

  const submitQuick = async () => {
    const interaction = await add({
      firstName: qName, memorableElement: "", note: qNote, location: qLocation,
      type: qType, result: qResult, duration: "medium", feelingScore: 7,
      womanScore: 7, confidenceScore: 5, objection: null, objectionCustom: "",
      discussionTopics: "", feedback: "", contactMethod: qContactMethod, contactValue: qContactValue,
      sessionId: "", tags: [], contextPhoto: null, date: new Date().toISOString(),
    });
    addXP(XP_VALUES.interaction_created, "Interaction rapide");
    if (qNote) addXP(XP_VALUES.interaction_with_note, "Note ajoutée");
    if (qResult === "close") addXP(XP_VALUES.close, "Close !");
    updateStreak();
    if (qResult === "close") {
      if (qContactMethod && qContactValue) addXP(XP_VALUES.contact_added, "Contact ajouté");
      await addContact({ firstName: qName || "Inconnue", sourceInteractionId: interaction.id, method: qContactMethod || "other", methodValue: qContactValue || "", status: "new", tags: [], notes: "" });
    }
    resetQuick();
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowQuick(false); }, 1200);
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-30">
      {/* Menu */}
      {open && !showQuick && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 animate-scale-in">
          <button
            onClick={() => { setOpen(false); setShowQuick(true); }}
            className="flex items-center gap-3 px-4 py-2.5 glass-card text-sm text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/20 transition-all shadow-lg whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Interaction rapide
          </button>
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 glass-card text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--glass-border-hover)] transition-all shadow-lg whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
              {a.label}
            </Link>
          ))}
        </div>
      )}

      {/* Quick interaction form — glass */}
      {showQuick && (
        <div className="absolute bottom-16 right-0 w-[320px] glass-heavy rounded-[var(--radius-xl)] shadow-[0_0_48px_-12px_var(--neon-purple),0_16px_48px_-16px_rgba(0,0,0,0.5)] animate-scale-in p-4 glass-reflect">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Interaction rapide
            </p>
            <Tooltip text="Fermer" position="left">
              <button onClick={() => { setShowQuick(false); resetQuick(); }} aria-label="Fermer" className="text-[var(--outline)] hover:text-[var(--on-surface)] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </Tooltip>
          </div>

          {saved ? (
            <div className="text-center py-6 animate-fade-in">
              <p className="text-emerald-400 font-semibold">Enregistré !</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input placeholder="Prénom (optionnel)" value={qName} onChange={(e) => setQName(e.target.value)}
                className="w-full rounded-[12px] bg-[var(--surface-low)] px-3 py-2 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] border border-[var(--border)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--neon-purple)] outline-none transition-all" />
              <input placeholder="Lieu" value={qLocation} onChange={(e) => setQLocation(e.target.value)}
                className="w-full rounded-[12px] bg-[var(--surface-low)] px-3 py-2 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] border border-[var(--border)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--neon-purple)] outline-none transition-all" />

              <div className="flex gap-1.5">
                {([["direct", "Direct"], ["indirect", "Indirect"], ["situational", "Situa."]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setQType(v)}
                    className={`flex-1 text-[11px] py-1.5 rounded-[10px] font-medium transition-all ${qType === v ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-[0_0_8px_-2px_var(--neon-purple)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}`}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                {([["close", "Close", "bg-emerald-500/15 text-emerald-400"], ["neutral", "Neutre", "bg-amber-400/15 text-amber-400"], ["rejection", "Rejet", "bg-[#fb7185]/15 text-[#fb7185]"]] as const).map(([v, l, c]) => (
                  <button key={v} type="button" onClick={() => setQResult(v)}
                    className={`flex-1 text-[11px] py-1.5 rounded-[10px] font-medium transition-all ${qResult === v ? c : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}`}>
                    {l}
                  </button>
                ))}
              </div>

              {qResult === "close" && (
                <div className="p-2 rounded-[12px] bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                  <div className="flex gap-1.5">
                    {([["instagram", "Insta"], ["phone", "Tel"], ["other", "Autre"]] as [ContactMethod, string][]).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setQContactMethod(qContactMethod === v ? null : v)}
                        className={`flex-1 text-[10px] py-1 rounded-[8px] font-medium transition-all ${qContactMethod === v ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {qContactMethod && (
                    <input placeholder={qContactMethod === "instagram" ? "@pseudo" : "06..."} value={qContactValue} onChange={(e) => setQContactValue(e.target.value)}
                      className="w-full rounded-[10px] bg-[var(--surface-low)] px-3 py-1.5 text-xs text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] border border-[var(--border)] focus:border-emerald-400/40 outline-none transition-all" />
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                <input placeholder="Note rapide..." value={qNote} onChange={(e) => setQNote(e.target.value)}
                  className="flex-1 rounded-[12px] bg-[var(--surface-low)] px-3 py-2 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] border border-[var(--border)] focus:border-[var(--border-focus)] outline-none transition-all" />
                <VoiceInput onResult={(t) => setQNote((prev) => prev ? `${prev} ${t}` : t)} />
              </div>

              <button onClick={submitQuick}
                className="w-full py-2.5 rounded-[14px] bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-sm font-semibold text-white hover:opacity-90 hover:shadow-[0_0_20px_-4px_var(--neon-purple)] transition-all">
                Enregistrer
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <Tooltip text="Ajout rapide" position="left">
        <button
          onClick={() => { if (showQuick) { setShowQuick(false); resetQuick(); } else { setOpen(!open); } }}
          className={cn(
            "w-14 h-14 rounded-[var(--radius-lg)] bg-gradient-to-br from-[#c084fc] to-[#f472b6] flex items-center justify-center shadow-lg shadow-[#c084fc]/20 hover:shadow-[0_0_24px_-4px_var(--neon-purple)] hover:scale-105 transition-all duration-200",
            (open || showQuick) && "rotate-45"
          )}
        >
          <svg className="w-7 h-7 text-white transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(" "); }
