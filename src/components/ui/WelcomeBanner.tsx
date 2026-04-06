"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "gp_has_seen_welcome";

export function WelcomeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 border border-[var(--primary)]/15 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-1">
            Bienvenue sur GameProgress !
          </h2>
          <p className="text-sm text-[var(--on-surface-variant)] mb-3">
            Commence par ajouter ta première interaction ou découvre toutes les fonctionnalités.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/interactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Première interaction
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--primary)]/30 transition-colors"
            >
              Découvrir le guide
            </Link>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fermer le message de bienvenue"
          className="shrink-0 p-1 rounded-lg text-[var(--outline)] hover:text-[var(--on-surface)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
