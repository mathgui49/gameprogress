"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useOfflineSync } from "@/hooks/useOffline";

export function OfflineBanner() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { online, pendingCount, syncing, initialized, lastReport } =
    useOfflineSync(userId);
  const [showErrors, setShowErrors] = useState(false);

  if (!initialized) return null;

  const hasErrors = lastReport && lastReport.failed > 0;

  // Show banner if: offline, syncing, pending items, or errors
  if (online && !syncing && pendingCount === 0 && !hasErrors) return null;

  return (
    <>
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[14px] border text-xs font-medium flex items-center gap-2 glass-heavy shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 ${
          !online
            ? "border-amber-500/30 text-amber-400"
            : hasErrors
              ? "border-red-500/30 text-red-400"
              : "border-emerald-500/30 text-emerald-400"
        }`}
      >
        {!online ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Mode hors-ligne
            {pendingCount > 0 && (
              <span className="text-amber-400/70">
                · {pendingCount} action{pendingCount > 1 ? "s" : ""} en attente
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <div className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            Synchronisation...
            <span className="text-emerald-400/70">
              {pendingCount} restante{pendingCount > 1 ? "s" : ""}
            </span>
          </>
        ) : hasErrors ? (
          <>
            <div className="w-2 h-2 rounded-full bg-red-400" />
            {lastReport.failed} sync échouée{lastReport.failed > 1 ? "s" : ""}
            <button
              onClick={() => setShowErrors((v) => !v)}
              className="underline text-red-400/80 hover:text-red-300"
            >
              {showErrors ? "Masquer" : "Détails"}
            </button>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            {pendingCount} action{pendingCount > 1 ? "s" : ""} en attente de
            sync
          </>
        )}
      </div>

      {/* Error details panel */}
      {showErrors && hasErrors && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm p-3 rounded-xl border border-red-500/20 glass-heavy text-xs text-red-300 space-y-1">
          <p className="font-medium text-red-400 mb-2">
            Erreurs de synchronisation :
          </p>
          {lastReport.errors.map((err, i) => (
            <p key={i} className="text-red-300/80 truncate">
              · {err}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
