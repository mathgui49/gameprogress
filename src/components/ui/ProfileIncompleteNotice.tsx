"use client";

import Link from "next/link";

export function ProfileIncompleteNotice() {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 animate-fade-in">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-400 mb-1">Complète ton profil pour continuer</p>
          <p className="text-xs text-[var(--on-surface-variant)] mb-3">
            Tu dois renseigner au moins ton <strong>prénom</strong> et ton <strong>nom d&apos;utilisateur</strong> avant de pouvoir interagir avec les autres utilisateurs.
          </p>
          <Link
            href="/profil"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/15 text-amber-400 text-xs font-medium hover:bg-amber-400/25 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Compléter mon profil
          </Link>
        </div>
      </div>
    </div>
  );
}
