"use client";

import { useMemo } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import { useContacts } from "@/hooks/useContacts";
import { useMissions } from "@/hooks/useMissions";
import { isToday, isThisWeek } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconMapPin, IconBarChart, IconSparkles, IconStar, IconFlame, IconUsers, IconPlus, IconTarget } from "@/components/ui/Icons";
import { BenchmarkCard } from "@/components/dashboard/BenchmarkCard";
import { useBenchmarks } from "@/hooks/useBenchmarks";
import Link from "next/link";

export default function DashboardPage() {
  const { interactions, loaded } = useInteractions();
  const gam = useGamification();
  const { contacts, allReminders } = useContacts();
  const { active: activeMissions } = useMissions();
  const { benchmarks } = useBenchmarks();

  const today = useMemo(() => interactions.filter((i) => isToday(i.date)), [interactions]);
  const thisWeek = useMemo(() => interactions.filter((i) => isThisWeek(i.date)), [interactions]);
  const closes = useMemo(() => interactions.filter((i) => i.result === "close"), [interactions]);
  const avgFeeling = useMemo(() => interactions.length > 0
    ? (interactions.reduce((sum, i) => sum + i.feelingScore, 0) / interactions.length).toFixed(1) : "\u2014", [interactions]);
  const closeRate = useMemo(() => interactions.length > 0 ? Math.round((closes.length / interactions.length) * 100) : 0, [closes, interactions]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  // Frosted ring progress
  const ringPct = gam.xpProgress;
  const ringStyle = {
    background: `conic-gradient(var(--primary-container) ${ringPct * 3.6}deg, var(--secondary-container) ${ringPct * 3.6}deg ${ringPct * 3.6 + 1}deg, var(--neon-purple) ${ringPct * 3.6 + 1}deg)`,
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Vue d&apos;ensemble de ta <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent font-medium">progression</span></p>
      </div>

      {/* XP hero with Frosted ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/[0.03] to-[var(--tertiary)]/[0.03]" />
        <div className="relative flex items-center gap-5">
          {/* Conic gradient ring */}
          <div className="relative w-16 h-16 shrink-0">
            <div className="absolute inset-0 rounded-full" style={ringStyle} />
            <div className="absolute inset-[3px] rounded-full bg-[var(--surface)] flex items-center justify-center">
              <span className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{gam.level}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--on-surface-variant)]">Niveau {gam.level}</span>
              <div className="flex items-center gap-3">
                <Tooltip text="Points d'expérience — gagne des XP en complétant des interactions et des missions" position="bottom">
                  <span className="text-xs text-[var(--primary)] font-semibold">{gam.xp}/{gam.xpForNext} XP</span>
                </Tooltip>
                {gam.streak > 0 && (
                  <Tooltip text="Nombre de jours consécutifs avec au moins une interaction" position="bottom">
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <IconFlame size={14} className="text-amber-400" /> {gam.streak}j
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[var(--surface-highest)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-700 shadow-[0_0_12px_var(--neon-purple)]" style={{ width: `${gam.xpProgress}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatsCard label="Aujourd'hui" value={today.length} subtitle="interactions" accent icon={<IconMapPin size={16} />} tooltip="Nombre d'interactions enregistrées aujourd'hui" />
        <StatsCard label="Cette semaine" value={thisWeek.length} subtitle="interactions" icon={<IconBarChart size={16} />} tooltip="Total des interactions cette semaine (lundi à dimanche)" />
        <StatsCard label="Closes" value={closes.length} subtitle={`${closeRate}% taux`} accent icon={<IconSparkles size={16} />} tooltip="Interactions conclues par un close (numéro, kiss, date...)" />
        <StatsCard label="Ressenti" value={avgFeeling} subtitle="moyenne /10" icon={<IconStar size={16} />} tooltip="Score moyen de ton ressenti après chaque interaction" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Activité récente</h2>
              <Link href="/interactions" className="text-xs text-[var(--primary)] hover:text-[var(--primary-dim)] transition-colors">Tout voir</Link>
            </div>
            <ActivityFeed interactions={interactions} />
          </Card>

          {/* Reminders */}
          {allReminders.length > 0 && (
            <Card>
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Rappels à venir</h2>
              <div className="space-y-2">
                {allReminders.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-low)]">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--on-surface)] truncate">{r.label}</p>
                      <p className="text-[10px] text-[var(--outline)]">{r.contactName}</p>
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
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Missions</h2>
              <Link href="/missions" className="text-xs text-[var(--primary)] hover:text-[var(--primary-dim)] transition-colors">Voir</Link>
            </div>
            {activeMissions.length === 0 ? (
              <p className="text-xs text-[var(--outline)]">Aucune mission active</p>
            ) : (
              <div className="space-y-3">
                {activeMissions.slice(0, 3).map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  return (
                    <div key={m.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[var(--on-surface-variant)] truncate">{m.title}</p>
                        <span className="text-[10px] text-[var(--outline)]">{m.current}/{m.target}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-highest)]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-500" style={{ width: `${pct}%` }} />
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
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Progression</h2>
              <Link href="/progression" className="text-xs text-[var(--primary)] hover:text-[var(--primary-dim)] transition-colors">Voir</Link>
            </div>
            <div className="space-y-3">
              {(["direct", "indirect", "situational"] as const).map((t) => {
                const count = interactions.filter((i) => i.type === t).length;
                const pct = interactions.length > 0 ? Math.round((count / interactions.length) * 100) : 0;
                const labels = { direct: "Direct", indirect: "Indirect", situational: "Situationnel" };
                const gradients = { direct: "from-[#c084fc] to-[#f472b6]", indirect: "from-[#818cf8] to-[#67e8f9]", situational: "from-[#67e8f9] to-[#34d399]" };
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--on-surface-variant)]">{labels[t]}</span>
                      <span className="text-[10px] text-[var(--outline)]">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--surface-highest)]">
                      <div className={`h-full rounded-full bg-gradient-to-r ${gradients[t]} transition-all duration-500`} style={{ width: `${pct}%` }} />
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
                  <p className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Pipeline</p>
                  <p className="text-xs text-[var(--outline)]">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--tertiary)]/10 flex items-center justify-center text-[var(--tertiary)]">
                  <IconUsers size={20} />
                </div>
              </div>
            </Card>
          </Link>

          {/* Benchmarks */}
          {benchmarks && interactions.length > 0 && (
            <BenchmarkCard
              benchmarks={benchmarks}
              userCloseRate={closeRate}
              userAvgFeeling={parseFloat(avgFeeling as string) || 0}
              userAvgConfidence={
                (() => {
                  const wc = interactions.filter((i) => (i.confidenceScore ?? 0) > 0);
                  return wc.length > 0 ? wc.reduce((s, i) => s + (i.confidenceScore ?? 0), 0) / wc.length : 0;
                })()
              }
              userLevel={gam.level}
            />
          )}

          {/* Quick add */}
          <Link href="/interactions/new">
            <Card hover className="group text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[var(--primary)]/15 transition-colors text-[var(--primary)]">
                <IconPlus size={24} />
              </div>
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Nouvelle interaction</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
