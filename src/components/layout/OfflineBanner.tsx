"use client";

import { useSession } from "next-auth/react";
import { useOfflineSync } from "@/hooks/useOffline";

export function OfflineBanner() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { online, pendingCount, syncing } = useOfflineSync(userId);

  // Only show when truly offline or actively syncing
  if (online && !syncing) return null;
  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 shadow-lg transition-all duration-300 ${
        !online
          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
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
          <span className="text-emerald-400/70">{pendingCount} restante{pendingCount > 1 ? "s" : ""}</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {pendingCount} action{pendingCount > 1 ? "s" : ""} en attente de sync
        </>
      )}
    </div>
  );
}
