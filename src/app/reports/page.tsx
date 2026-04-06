"use client";

import { useState, useMemo, useRef } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useGamification } from "@/hooks/useGamification";
import { useMissions } from "@/hooks/useMissions";
import { computeSkillScore, getSkillRank, SKILL_RANK_LABELS, SKILL_RANK_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";
import { IconFlame, IconAward } from "@/components/ui/Icons";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { ExportButton } from "@/components/reports/ExportButton";
import { BenchmarkCard } from "@/components/dashboard/BenchmarkCard";
import { useBenchmarks } from "@/hooks/useBenchmarks";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeCard } from "@/components/ui/PremiumGate";
import { PLAN_NAME_PRO } from "@/lib/premium";

type Period = "month" | "quarter" | "all";

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("fr-FR", { month: "short" });
  return `${day} ${month}`;
}

function getWeeksData(interactions: any[], numWeeks: number) {
  const now = new Date();
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
    const weekInteractions = interactions.filter((int) => {
      const d = new Date(int.date);
      return d >= weekStart && d < weekEnd;
    });
    return { weekStart, weekEnd, interactions: weekInteractions };
  }).reverse();
}

export default function ReportsPage() {
  const { interactions, loaded } = useInteractions();
  const { contacts } = useContacts();
  const gam = useGamification();
  const { completed: completedMissions } = useMissions();
  const [period, setPeriod] = useState<Period>("month");
  const reportRef = useRef<HTMLDivElement>(null);
  const { benchmarks } = useBenchmarks();
  const { isPremium } = useSubscription();

  const analytics = useMemo(() => {
    if (!loaded) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Period filtering
    const getPeriodStart = (p: Period) => {
      const d = new Date();
      if (p === "month") { d.setMonth(d.getMonth() - 1); return d; }
      if (p === "quarter") { d.setMonth(d.getMonth() - 3); return d; }
      return new Date(0);
    };

    const periodStart = getPeriodStart(period);
    const periodInteractions = interactions.filter((i) => new Date(i.date) >= periodStart);

    // This month / last month
    const thisMonth = interactions.filter((i) => {
      const d = new Date(i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const lastMonth = interactions.filter((i) => {
      const d = new Date(i.date);
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === lm && d.getFullYear() === ly;
    });

    // Key metrics
    const tmCloses = thisMonth.filter((i) => i.result === "close").length;
    const lmCloses = lastMonth.filter((i) => i.result === "close").length;
    const tmAvgFeel = thisMonth.length > 0
      ? thisMonth.reduce((s, i) => s + i.feelingScore, 0) / thisMonth.length
      : 0;
    const tmCloseRate = thisMonth.length > 0 ? (tmCloses / thisMonth.length) * 100 : 0;
    const lmCloseRate = lastMonth.length > 0
      ? (lastMonth.filter((i) => i.result === "close").length / lastMonth.length) * 100 : 0;

    // Weekly data (12 weeks)
    const weeks = getWeeksData(interactions, 12);

    // Close rate by week (8 weeks)
    const closeRateWeekly = getWeeksData(interactions, 8).map((w) => {
      const total = w.interactions.length;
      const closes = w.interactions.filter((i) => i.result === "close").length;
      return {
        label: getWeekLabel(w.weekStart),
        value: total > 0 ? Math.round((closes / total) * 100) : 0,
      };
    });
    const avgCloseRate = interactions.length > 0
      ? Math.round((interactions.filter((i) => i.result === "close").length / interactions.length) * 100)
      : 0;

    // Feeling score over time (8 weeks)
    const feelingWeekly = getWeeksData(interactions, 8).map((w) => {
      const avg = w.interactions.length > 0
        ? w.interactions.reduce((s, i) => s + i.feelingScore, 0) / w.interactions.length
        : 0;
      return { label: getWeekLabel(w.weekStart), value: Math.round(avg * 10) / 10 };
    });
    const avgFeeling = interactions.length > 0
      ? interactions.reduce((s, i) => s + i.feelingScore, 0) / interactions.length
      : 0;

    // Bar chart data (12 weeks)
    const weeklyBars = weeks.map((w) => ({
      label: getWeekLabel(w.weekStart),
      value: w.interactions.length,
    }));

    // Result breakdown (period)
    const closes = periodInteractions.filter((i) => i.result === "close").length;
    const neutrals = periodInteractions.filter((i) => i.result === "neutral").length;
    const rejections = periodInteractions.filter((i) => i.result === "rejection").length;

    // Type breakdown (period)
    const direct = periodInteractions.filter((i) => i.type === "direct").length;
    const indirect = periodInteractions.filter((i) => i.type === "indirect").length;
    const situational = periodInteractions.filter((i) => i.type === "situational").length;

    // Heatmap
    const heatmapData: Record<string, number> = {};
    interactions.forEach((i) => {
      const key = new Date(i.date).toISOString().slice(0, 10);
      heatmapData[key] = (heatmapData[key] || 0) + 1;
    });

    // Badges this month
    const unlockedBadges = gam.badges.filter((b) => {
      if (!b.unlockedAt) return false;
      const d = new Date(b.unlockedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Skill score
    const total = interactions.length;
    const allCloses = interactions.filter((i) => i.result === "close").length;
    const cr = total > 0 ? allCloses / total : 0;
    const af = total > 0 ? interactions.reduce((s, i) => s + i.feelingScore, 0) / total : 0;
    const skillScore = computeSkillScore({ totalInteractions: total, closeRate: cr, avgFeelingScore: af, streak: gam.streak });
    const skillRank = getSkillRank(skillScore);

    // Best day of week
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    interactions.forEach((i) => { dayTotals[new Date(i.date).getDay()]++; });
    const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    return {
      thisMonth, lastMonth, tmCloses, lmCloses, tmAvgFeel, tmCloseRate, lmCloseRate,
      closeRateWeekly, avgCloseRate,
      feelingWeekly, avgFeeling,
      weeklyBars,
      closes, neutrals, rejections,
      direct, indirect, situational,
      heatmapData, unlockedBadges,
      skillScore, skillRank,
      bestDay: dayNames[bestDayIdx],
      periodInteractions,
    };
  }, [interactions, loaded, period, gam]);

  if (!loaded || !analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const diff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? "+∞" : "=";
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const periodLabels: Record<Period, string> = { month: "Ce mois", quarter: "3 mois", all: "Tout" };

  return (
    <div ref={reportRef} className="px-4 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto animate-fade-in print:max-w-none print:px-6 print:py-4 print:text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#f59e0b] to-[#c084fc] bg-clip-text text-transparent">
              Rapport & Analytics
            </span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Analyse detaillee de tes performances et tendances — <span className="capitalize">{monthName}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--surface-highest)] rounded-lg p-0.5">
            {(["month", "quarter", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  period === p
                    ? "bg-[var(--primary)] text-white font-semibold"
                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <ExportButton targetRef={reportRef} />
        </div>
      </div>

      {/* Upgrade hint for free users */}
      {!isPremium && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
          <p className="text-xs text-[var(--primary)]">Données limitées à la semaine en cours. Passe à {PLAN_NAME_PRO} pour l&apos;historique complet et l&apos;export PDF.</p>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Interactions", val: analytics.thisMonth.length, prev: analytics.lastMonth.length, accent: true },
          { label: "Closes", val: analytics.tmCloses, prev: analytics.lmCloses, accent: true },
          { label: "Taux close", val: `${Math.round(analytics.tmCloseRate)}%`, prev: Math.round(analytics.lmCloseRate), numVal: Math.round(analytics.tmCloseRate), accent: false, showDiff: true },
          { label: "Ressenti moy.", val: analytics.tmAvgFeel > 0 ? analytics.tmAvgFeel.toFixed(1) : "—", prev: null, accent: false },
          { label: "Jour favori", val: analytics.bestDay, prev: null, accent: false },
        ].map((m) => (
          <Card key={m.label} className="!p-4">
            <p className="text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">{m.label}</p>
            <p className={`text-2xl font-bold ${m.accent ? "text-[var(--primary)]" : "text-[var(--on-surface)]"}`}>{m.val}</p>
            {m.prev !== null && !m.showDiff && (
              <p className={`text-[10px] mt-1 ${(m.val as number) >= m.prev ? "text-emerald-400" : "text-[#fb7185]"}`}>
                {diff(m.val as number, m.prev)} vs mois dernier
              </p>
            )}
            {m.showDiff && m.prev !== null && (
              <p className={`text-[10px] mt-1 ${(m.numVal ?? 0) >= m.prev ? "text-emerald-400" : "text-[#fb7185]"}`}>
                {diff(m.numVal ?? 0, m.prev)} vs mois dernier
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Heatmap */}
      <Card className="mb-6">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
          Activité (12 semaines)
        </h2>
        <HeatmapChart data={analytics.heatmapData} weeks={12} />
      </Card>

      {/* Charts row 1: Activity bar + Close rate line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
            Interactions par semaine
          </h2>
          <BarChart data={analytics.weeklyBars} height={160} />
        </Card>

        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
            Taux de close par semaine
          </h2>
          <LineChart
            data={analytics.closeRateWeekly}
            color="#10b981"
            suffix="%"
            avgLine={analytics.avgCloseRate}
            height={160}
          />
        </Card>
      </div>

      {/* Charts row 2: Feeling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
            Ressenti dans le temps
          </h2>
          <LineChart
            data={analytics.feelingWeekly}
            color="#c084fc"
            avgLine={analytics.avgFeeling}
            height={160}
          />
        </Card>
      </div>

      {/* Charts row 3: Donut result + Donut type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
            Résultats
          </h2>
          <DonutChart
            segments={[
              { label: "Close", value: analytics.closes, color: "#10b981" },
              { label: "Neutre", value: analytics.neutrals, color: "#f59e0b" },
              { label: "Rejet", value: analytics.rejections, color: "#fb7185" },
            ]}
            centerValue={String(analytics.periodInteractions.length)}
            centerLabel="total"
          />
        </Card>

        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
            Types d&apos;approche
          </h2>
          <DonutChart
            segments={[
              { label: "Direct", value: analytics.direct, color: "#c084fc" },
              { label: "Indirect", value: analytics.indirect, color: "#818cf8" },
              { label: "Situationnel", value: analytics.situational, color: "#22d3ee" },
            ]}
            centerValue={String(analytics.periodInteractions.length)}
            centerLabel="total"
          />
        </Card>
      </div>

      {/* Progression + Badges + Skill */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Progression
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Niveau</span>
              <span className="text-sm font-bold text-[var(--primary)]">{gam.level}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">XP total</span>
              <span className="text-sm font-bold text-[var(--tertiary)]">{gam.xp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Streak actuel</span>
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                <IconFlame size={14} className="text-amber-400" /> {gam.streak}j
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Best streak</span>
              <span className="text-sm font-bold text-amber-400/60">{gam.bestStreak}j</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--on-surface-variant)]">Missions</span>
              <span className="text-sm font-bold text-emerald-400">{completedMissions.length}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Rang de compétence
          </h2>
          <div className="flex flex-col items-center py-3">
            <div className="w-20 h-20 rounded-full border-4 border-[var(--primary)]/30 flex items-center justify-center mb-3"
              style={{ background: `conic-gradient(var(--primary) ${analytics.skillScore}%, var(--surface-highest) 0)` }}>
              <div className="w-16 h-16 rounded-full bg-[var(--surface-high)] flex items-center justify-center">
                <span className="text-xl font-bold text-[var(--on-surface)]">{analytics.skillScore}</span>
              </div>
            </div>
            <span className={`text-sm font-bold ${SKILL_RANK_COLORS[analytics.skillRank]}`}>
              {SKILL_RANK_LABELS[analytics.skillRank]}
            </span>
            <span className="text-[10px] text-[var(--outline)] mt-1">Score global /100</span>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Badges ce mois
          </h2>
          {analytics.unlockedBadges.length === 0 ? (
            <p className="text-xs text-[var(--outline)]">Aucun nouveau badge ce mois-ci</p>
          ) : (
            <div className="space-y-2">
              {analytics.unlockedBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                    <IconAward size={18} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--on-surface)] font-medium">{b.name}</p>
                    <p className="text-[10px] text-[var(--outline)]">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Benchmarks */}
      {benchmarks && interactions.length > 0 && (
        <div className="mb-6">
          <BenchmarkCard
            benchmarks={benchmarks}
            userCloseRate={Math.round(analytics.tmCloseRate)}
            userAvgFeeling={analytics.tmAvgFeel}
            userLevel={gam.level}
          />
        </div>
      )}

      {/* Pipeline — Conversion Funnel */}
      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">
          Pipeline — Entonnoir de conversion
        </h2>
        {(() => {
          const funnelSteps: { key: string; label: string; color: string }[] = [
            { key: "total", label: "Total closes", color: "bg-[var(--primary)]" },
            { key: "contacted", label: "Contacte", color: "bg-cyan-400" },
            { key: "replied", label: "Repondu", color: "bg-[var(--tertiary)]" },
            { key: "date_planned", label: "Date planifie", color: "bg-amber-400" },
            { key: "first_date", label: "Premier date", color: "bg-emerald-400" },
            { key: "kissclose", label: "Kiss close", color: "bg-[#f472b6]" },
            { key: "fuckclose", label: "Fuck close", color: "bg-rose-400" },
          ];
          const statusOrder = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced", "archived"];
          const total = contacts.length;
          const funnelCounts = funnelSteps.map((step) => {
            if (step.key === "total") return { ...step, count: total };
            const stepIdx = statusOrder.indexOf(step.key);
            const count = contacts.filter((c) => statusOrder.indexOf(c.status) >= stepIdx).length;
            return { ...step, count };
          });
          const maxCount = Math.max(total, 1);

          return (
            <div className="space-y-2">
              {funnelCounts.map((step, idx) => {
                const pct = total > 0 ? Math.round((step.count / total) * 100) : 0;
                const widthPct = Math.max((step.count / maxCount) * 100, 8);
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--outline)] w-24 text-right shrink-0">{step.label}</span>
                    <div className="flex-1 h-6 bg-[var(--surface-high)] rounded-lg overflow-hidden relative">
                      <div className={`h-full ${step.color} rounded-lg transition-all duration-500`} style={{ width: `${widthPct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-[var(--on-surface)]">
                        {step.count} {idx > 0 ? `(${pct}%)` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Pipeline — Temps moyen par étape + méthode stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Temps moyen par étape
          </h2>
          {(() => {
            const steps = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose"];
            const stepLabels: Record<string, string> = { new: "Close → Contact", contacted: "Contact → Réponse", replied: "Réponse → Date", date_planned: "Date → 1er RDV", first_date: "1er → 2e RDV", second_date: "2e RDV → Kiss", kissclose: "Kiss → Fuck" };
            const durations: { label: string; avg: number }[] = [];

            contacts.forEach((c) => {
              const sorted = [...c.timeline].filter((e) => e.type === "status_change").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              for (let i = 1; i < sorted.length; i++) {
                const days = Math.floor((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000);
                const prevLabel = stepLabels[steps[i - 1]] || `Etape ${i}`;
                const existing = durations.find((d) => d.label === prevLabel);
                if (existing) { existing.avg = (existing.avg + days) / 2; }
                else { durations.push({ label: prevLabel, avg: days }); }
              }
            });

            if (durations.length === 0) return <p className="text-xs text-[var(--outline)]">Pas assez de donnees</p>;
            return (
              <div className="space-y-2">
                {durations.slice(0, 6).map((d) => (
                  <div key={d.label} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--on-surface-variant)]">{d.label}</span>
                    <span className="text-xs font-bold text-[var(--primary)]">{d.avg.toFixed(1)}j</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        <Card>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Taux de réponse par méthode
          </h2>
          {(() => {
            const methods = ["instagram", "phone", "other"] as const;
            const methodLabels = { instagram: "Instagram", phone: "Téléphone", other: "Autre" };
            const stats = methods.map((m) => {
              const total = contacts.filter((c) => c.method === m).length;
              const replied = contacts.filter((c) => c.method === m && ["replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"].includes(c.status)).length;
              return { method: m, label: methodLabels[m], total, replied, rate: total > 0 ? Math.round((replied / total) * 100) : 0 };
            }).filter((s) => s.total > 0);

            if (stats.length === 0) return <p className="text-xs text-[var(--outline)]">Pas assez de donnees</p>;
            return (
              <div className="space-y-3">
                {stats.map((s) => (
                  <div key={s.method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--on-surface-variant)]">{s.label}</span>
                      <span className="text-xs font-bold text-[var(--tertiary)]">{s.rate}% ({s.replied}/{s.total})</span>
                    </div>
                    <div className="h-2 bg-[var(--surface-high)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--tertiary)] rounded-full transition-all" style={{ width: `${s.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
