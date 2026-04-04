"use client";

import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import { useContacts } from "@/hooks/useContacts";
import { useMissions } from "@/hooks/useMissions";
import { isToday, isThisWeek } from "@/lib/utils";
import { xpForLevel } from "@/types";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function DashboardPage() {
  const { interactions, loaded } = useInteractions();
  const gam = useGamification();
  const { contacts, allReminders } = useContacts();
  const { active: activeMissions } = useMissions();

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const today = interactions.filter((i) => isToday(i.date));
  const thisWeek = interactions.filter((i) => isThisWeek(i.date));
  const closes = interactions.filter((i) => i.result === "close");
  const avgFeeling = interactions.length > 0
    ? (interactions.reduce((sum, i) => sum + i.feelingScore, 0) / interactions.length).toFixed(1) : "—";
  const closeRate = interactions.length > 0 ? Math.round((closes.length / interactions.length) * 100) : 0;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm text-[#adaaab]">Vue d&apos;ensemble de ta progression</p>
      </div>

      {/* XP bar hero */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#85adff]/[0.03] to-[#ac8aff]/[0.03]" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#85adff] to-[#ac8aff] flex items-center justify-center shadow-lg shadow-[#85adff]/15 shrink-0">
            <span className="text-lg font-bold text-white">{gam.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#adaaab]">Niveau {gam.level}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#85adff] font-semibold">{gam.xp}/{gam.xpForNext} XP</span>
                {gam.streak > 0 && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">🔥 {gam.streak}j</span>
                )}
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#85adff] to-[#ac8aff] transition-all duration-700" style={{ width: `${gam.xpProgress}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatsCard label="Aujourd'hui" value={today.length} subtitle="interactions" accent icon="📍" />
        <StatsCard label="Cette semaine" value={thisWeek.length} subtitle="interactions" icon="📊" />
        <StatsCard label="Closes" value={closes.length} subtitle={`${closeRate}% taux`} accent icon="✨" />
        <StatsCard label="Ressenti" value={avgFeeling} subtitle="moyenne /10" icon="💫" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Activite recente</h2>
              <Link href="/interactions" className="text-xs text-[#85adff] hover:text-[#699cff] transition-colors">Tout voir</Link>
            </div>
            <ActivityFeed interactions={interactions} />
          </Card>

          {/* Reminders */}
          {allReminders.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-white mb-3">Rappels a venir</h2>
              <div className="space-y-2">
                {allReminders.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.label}</p>
                      <p className="text-[10px] text-[#484849]">{r.contactName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Missions */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Missions</h2>
              <Link href="/missions" className="text-xs text-[#85adff] hover:text-[#699cff] transition-colors">Voir</Link>
            </div>
            {activeMissions.length === 0 ? (
              <p className="text-xs text-[#484849]">Aucune mission active</p>
            ) : (
              <div className="space-y-3">
                {activeMissions.slice(0, 3).map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  return (
                    <div key={m.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#adaaab] truncate">{m.title}</p>
                        <span className="text-[10px] text-[#484849]">{m.current}/{m.target}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/40">
                        <div className="h-full rounded-full bg-[#85adff] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Progression */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Progression</h2>
              <Link href="/progression" className="text-xs text-[#85adff] hover:text-[#699cff] transition-colors">Voir</Link>
            </div>
            <div className="space-y-3">
              {(["direct", "indirect", "situational"] as const).map((t) => {
                const count = interactions.filter((i) => i.type === t).length;
                const pct = interactions.length > 0 ? Math.round((count / interactions.length) * 100) : 0;
                const labels = { direct: "Direct", indirect: "Indirect", situational: "Situationnel" };
                const colors = { direct: "#85adff", indirect: "#ac8aff", situational: "#67e8f9" };
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#adaaab]">{labels[t]}</span>
                      <span className="text-[10px] text-[#484849]">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/40">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colors[t] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Pipeline summary */}
          <Link href="/contacts">
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-white">Pipeline</p>
                  <p className="text-xs text-[#484849]">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#ac8aff]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#ac8aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          {/* Quick add */}
          <Link href="/interactions/new">
            <Card hover className="group text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#85adff]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#85adff]/15 transition-colors">
                <svg className="w-6 h-6 text-[#85adff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#adaaab]">Nouvelle interaction</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
