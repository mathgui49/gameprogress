"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
    // Basic error tracking: send to server action (fire-and-forget)
    try {
      const payload = {
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        digest: error.digest,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
      fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Tracking itself should never throw
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md animate-fade-in">
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--error)]/10 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-3">
          Oups, quelque chose a plante
        </h1>

        <p className="text-sm text-[var(--on-surface-variant)] mb-8 leading-relaxed">
          Pas de panique — tes donnees sont en securite. Essaie de recharger la page ou retourne au dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-sm font-semibold text-white hover:shadow-[0_0_24px_-4px_var(--neon-purple)] transition-all hover:scale-105 active:scale-95"
          >
            Reessayer
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--border-hover)] transition-all"
          >
            Retour au Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
