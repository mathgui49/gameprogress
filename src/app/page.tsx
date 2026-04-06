"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import { useContacts } from "@/hooks/useContacts";
import { useMissions } from "@/hooks/useMissions";
import { useSessions } from "@/hooks/useSessions";
import { useJournal } from "@/hooks/useJournal";
import { isToday, isThisWeek } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconMapPin, IconBarChart, IconSparkles, IconStar, IconFlame, IconUsers, IconPlus, IconTarget, IconCalendar, IconPenLine, IconTrendingUp, IconAward } from "@/components/ui/Icons";
import { BadgeIcon } from "@/components/ui/BadgeIcon";
import { BenchmarkCard } from "@/components/dashboard/BenchmarkCard";
import { useBenchmarks } from "@/hooks/useBenchmarks";
import Link from "next/link";
import { DashboardUpgradeBanner } from "@/components/ui/PremiumGate";
import { WelcomeBanner } from "@/components/ui/WelcomeBanner";

/* ─── Animated counter ──────────────────────────────────── */
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    prev.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}

/* ─── Tips ticker ───────────────────────────────────────── */
const TIPS = [
  "Astuce : Après un rejet, note ce que tu as appris — chaque rejet est un pas vers le progrès.",
  "Astuce : Varie tes approches (direct, indirect, situationnel) pour développer ta polyvalence.",
  "Astuce : Utilise le journal pour capturer tes émotions après chaque session.",
  "Astuce : Fixe-toi une mission simple pour cette semaine — la régularité bat l'intensité.",
  "Astuce : Reviens voir ta progression chaque semaine pour mesurer ton évolution.",
  "Astuce : Les wings sont plus efficaces que le solo — invite un ami !",
  "Astuce : Définis des objectifs avant chaque session pour rester concentré.",
  "Astuce : Un streak de 7 jours te donne un bonus XP de +40% sur les interactions.",
];

function TipsTicker() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TIPS.length);
        setFade(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--surface-low)] border border-[var(--border)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className={`text-xs text-[var(--on-surface-variant)] transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}>
          {TIPS[idx]}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { interactions, loaded } = useInteractions();
  const gam = useGamification();
  const { contacts, allReminders } = useContacts();
  const { active: activeMissions } = useMissions();
  const { sessions } = useSessions();
  const { entries: journalEntries } = useJournal();
  const { benchmarks } = useBenchmarks();

  const today = useMemo(() => interactions.filter((i) => isToday(i.date)), [interactions]);
  const thisWeek = useMemo(() => interactions.filter((i) => isThisWeek(i.date)), [interactions]);
  const closes = useMemo(() => interactions.filter((i) => i.result === "close"), [interactions]);
  const avgFeeling = useMemo(() => interactions.length > 0
    ? (interactions.reduce((sum, i) => sum + i.feelingScore, 0) / interactions.length).toFixed(1) : "\u2014", [interactions]);
  const closeRate = useMemo(() => interactions.length > 0 ? Math.round((closes.length / interactions.length) * 100) : 0, [closes, interactions]);

  // Upcoming sessions (future dates)
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => new Date(s.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [sessions]);

  // Recent journal entries
  const recentJournal = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [journalEntries]);

  // Unlocked badges
  const unlockedBadges = useMemo(() => {
    return gam.badges.filter((b) => b.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime());
  }, [gam.badges]);

  // Weekly chart data (last 7 days)
  const weeklyData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = interactions.filter((int) => int.date.startsWith(dateStr)).length;
      days.push({ label: d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3), count });
    }
    return days;
  }, [interactions]);
  const maxWeekly = Math.max(...weeklyData.map((d) => d.count), 1);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

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

      <WelcomeBanner />
      <DashboardUpgradeBanner />

      {/* XP hero with Frosted ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/[0.03] to-[var(--tertiary)]/[0.03]" />
        <div className="relative flex items-center gap-5">
          <div className="relative w-16 h-16 shrink-0 animate-float">
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

      {/* Stats grid — animated numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatsCard label="Aujourd'hui" value={<AnimatedNumber value={today.length} />} subtitle="interactions" accent icon={<IconMapPin size={16} />} tooltip="Nombre d'interactions enregistrées aujourd'hui" />
        <StatsCard label="Cette semaine" value={<AnimatedNumber value={thisWeek.length} />} subtitle="interactions" icon={<IconBarChart size={16} />} tooltip="Total des interactions cette semaine (lundi à dimanche)" />
        <StatsCard label="Closes" value={<AnimatedNumber value={closes.length} />} subtitle={`${closeRate}% taux`} accent icon={<IconSparkles size={16} />} tooltip="Interactions conclues par un close (numéro, kiss, date...)" />
        <StatsCard label="Ressenti" value={avgFeeling} subtitle="moyenne /10" icon={<IconStar size={16} />} tooltip="Score moyen de ton ressenti après chaque interaction" />
      </div>

      {/* Main grid — balanced 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Activity feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Activité récente</h2>
              <Link href="/interactions" className="text-xs text-[var(--primary)] hover:text-[var(--primary-dim)] transition-colors">Tout voir</Link>
            </div>
            <ActivityFeed interactions={interactions} />
          </Card>

          {/* Weekly mini chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Cette semaine</h2>
              <span className="text-xs text-[var(--outline)]">{thisWeek.length} interaction{thisWeek.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-[var(--primary)] to-[var(--secondary)] transition-all duration-700 hover:opacity-80"
                      style={{ height: `${Math.max((d.count / maxWeekly) * 100, 4)}%`, animationDelay: `${i * 80}ms` }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--outline)]">{d.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Reminders */}
          {allReminders.length > 0 && (
            <Card>
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Rappels à venir</h2>
              <div className="space-y-2">
                {allReminders.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-low)]">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-xp-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--on-surface)] truncate">{r.label}</p>
                      <p className="text-[10px] text-[var(--outline)]">{r.contactName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Benchmarks */}
          {benchmarks && interactions.length > 0 && (
            <BenchmarkCard
              benchmarks={benchmarks}
              userCloseRate={closeRate}
              userAvgFeeling={parseFloat(avgFeeling as string) || 0}
              userLevel={gam.level}
            />
          )}
        </div>

        {/* RIGHT COLUMN */}
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

          {/* Upcoming sessions */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Prochaines sessions</h2>
              <Link href="/sessions" className="text-xs text-[var(--primary)] hover:text-[var(--primary-dim)] transition-colors">Voir</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-2 text-[var(--primary)]">
                  <IconCalendar size={18} />
                </div>
                <p className="text-xs text-[var(--outline)]">Aucune session à venir</p>
                <Link href="/sessions/new" className="text-[10px] text-[var(--primary)] hover:underline mt-1 inline-block">Planifier une session</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map((s) => (
                  <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-low)] hover:bg-[var(--surface-high)] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[var(--tertiary)]/10 flex items-center justify-center shrink-0 text-[var(--tertiary)]">
                      <IconCalendar size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--on-surface)] truncate">{s.title}</p>
                      <p className="text-[10px] text-[var(--outline)]">{new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} — {s.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Pipeline + Journal row */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/contacts">
              <Card hover className="h-full">
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
            <Link href="/journal">
              <Card hover className="h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Journal</p>
                    <p className="text-xs text-[var(--outline)]">{journalEntries.length} entrée{journalEntries.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[var(--secondary)]/10 flex items-center justify-center text-[var(--secondary)]">
                    <IconPenLine size={20} />
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Badges */}
          {unlockedBadges.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Badges récents</h2>
                <span className="text-[10px] text-[var(--outline)]">{unlockedBadges.length}/{gam.badges.length}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {unlockedBadges.slice(0, 5).map((b) => (
                  <Tooltip key={b.id} text={b.description} position="top">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c084fc]/15 to-[#f472b6]/15 flex items-center justify-center animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                        <BadgeIcon icon={b.icon} size={20} />
                      </div>
                      <span className="text-[9px] text-[var(--outline)] text-center max-w-[60px] truncate">{b.name}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </Card>
          )}

          {/* Tips ticker */}
          <TipsTicker />

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
