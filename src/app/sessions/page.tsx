"use client";

import { useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export default function SessionsPage() {
  const { sessions, loaded } = useSessions();
  const { interactions } = useInteractions();

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Sessions</h1>
          <p className="text-sm text-[#adaaab]">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/sessions/new"><Button>+ Session</Button></Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="Aucune session" description="Une session regroupe plusieurs interactions lors d'une sortie." action={<Link href="/sessions/new"><Button>Creer une session</Button></Link>} />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const sessionInteractions = interactions.filter((i) => s.interactionIds.includes(i.id));
            const closes = sessionInteractions.filter((i) => i.result === "close").length;
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <Card hover className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-0.5">{s.title || "Session sans titre"}</h3>
                      <p className="text-xs text-[#484849]">{formatDate(s.date)} {s.location && `· ${s.location}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#85adff]/15 text-[#85adff]">{s.interactionIds.length} interactions</Badge>
                      {closes > 0 && <Badge className="bg-emerald-400/15 text-emerald-400">{closes} close{closes > 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                  {s.wings.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] text-[#484849]">Wings:</span>
                      {s.wings.map((w) => <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-[#262627] text-[#adaaab]">{w}</span>)}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
