"use client";

import { useState, useEffect, useCallback } from "react";
import { getItem, setItem } from "@/lib/storage";

const TUTORIAL_KEY = "gp_tutorial_done";

interface TutorialStep {
  icon: string;
  title: string;
  description: string;
  tip?: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    title: "Bienvenue sur GameProgress !",
    description: "GameProgress est ton compagnon de progression sociale. Suis tes interactions, fixe des objectifs, progresse et connecte-toi avec d'autres utilisateurs.",
    tip: "Ce tutoriel te guide a travers les fonctionnalites cles. Tu peux le revoir a tout moment depuis les parametres.",
  },
  {
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    title: "Interactions",
    description: "Enregistre chaque interaction sociale : approche, conversation, numero, date... Note le lieu, le contexte, et evalue ta performance.",
    tip: "Utilise le bouton + en bas a droite pour ajouter rapidement une interaction.",
  },
  {
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    title: "Sessions",
    description: "Regroupe tes interactions par session (soiree, sortie, workshop...). Invite tes wings a participer et retrouve tout dans ton calendrier.",
    tip: "Tes wings recevront une notification et pourront accepter ou decliner l'invitation.",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Pipeline & Contacts",
    description: "Gere tes contacts comme un pipeline : Lead, Numero, Date planifie, En relation... Suis l'evolution de chaque relation.",
    tip: "Clique sur un contact pour voir tout l'historique de tes interactions avec cette personne.",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Wings",
    description: "Connecte-toi avec d'autres utilisateurs ! Envoie des invitations wing pour partager tes sessions, voir leurs stats et progresser ensemble.",
    tip: "Tu controles ce que tes wings voient dans Profil > Confidentialite.",
  },
  {
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    title: "Progression & Stats",
    description: "Visualise ta progression avec des graphiques detailles : nombre d'interactions, taux de succes, evolution par semaine.",
    tip: "Consulte aussi le classement pour te comparer avec les autres utilisateurs.",
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    title: "Missions & XP",
    description: "Complete des missions quotidiennes et hebdomadaires pour gagner de l'XP. Monte de niveau et debloque des badges.",
    tip: "Les missions se renouvellent chaque jour — connecte-toi regulierement pour maintenir ta streak !",
  },
  {
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    title: "Journal & Feed",
    description: "Ecris dans ton journal pour documenter tes reflexions et apprentissages. Partage des posts dans le feed pour inspirer la communaute.",
    tip: "Choisis la visibilite de chaque entree : prive, wings seulement, ou public.",
  },
  {
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    title: "Profil & Parametres",
    description: "Personnalise ton profil public (photo, bio, ville), gere ta confidentialite, et configure l'apparence de l'app.",
    tip: "Accede a ton profil et parametres via ton avatar en haut a droite.",
  },
];

export function Tutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = getItem<boolean>(TUTORIAL_KEY, false);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    setItem(TUTORIAL_KEY, true);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />
      <div className="relative w-full max-w-md mx-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-[0_0_64px_-12px_var(--neon-purple)] animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-[var(--surface-low)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-medium text-[var(--outline)]">
              {step + 1} / {STEPS.length}
            </span>
            <button onClick={finish} className="text-xs text-[var(--outline)] hover:text-[var(--on-surface)] transition-colors">
              Passer
            </button>
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--tertiary)]/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={current.icon} />
            </svg>
          </div>

          {/* Content */}
          <h2 className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] text-center mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-[var(--on-surface-variant)] text-center leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--primary)]/8 border border-[var(--primary)]/15 mb-5">
              <svg className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <p className="text-xs text-[var(--primary)] leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={prev}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] transition-colors"
              >
                Precedent
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLast ? "C'est parti !" : "Suivant"}
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === step ? "w-4 bg-[var(--primary)]" : i < step ? "bg-[var(--primary)]/40" : "bg-[var(--outline-variant)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Button to reopen tutorial from settings */
export function TutorialResetButton() {
  const handleReset = () => {
    setItem(TUTORIAL_KEY, false);
    window.location.reload();
  };

  return (
    <button
      onClick={handleReset}
      className="text-sm px-4 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors"
    >
      Revoir le tutoriel
    </button>
  );
}
