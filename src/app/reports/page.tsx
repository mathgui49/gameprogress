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
import { PLAN_NAME_PRO } from "@/lib/premium";

type Period = "week" | "month" | "3months" | "year" | "custom";

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

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function getMonthsData(interactions: any[], numMonths: number) {
  const now = new Date();
  return Array.from({ length: numMonths }, (_, i) => {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthInteractions = interactions.filter((int) => {
      const d = new Date(int.date);
      return d >= monthStart && d <= monthEnd;
    });
    return { monthStart, monthEnd, interactions: monthInteractions, label: getMonthLabel(monthStart) };
  }).reverse();
}

export default function ReportsPage() {
  const { interactions, loaded } = useInteractions();
  const { contacts } = useContacts();
  const gam = useGamification();
  const { completed: completedMissions } = useMissions();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const { benchmarks } = useBenchmarks();
  const { isPremium } = useSubscription();

  const analytics = useMemo(() => {
    if (!loaded) return null;

    const getPeriodRange = (p: Period): { start: Date; end: Date } => {
      const end = new Date();
      const start = new Date();
      if (p === "week") { start.setDate(start.getDate() - 7); }
      else if (p === "month") { start.setMonth(start.getMonth() - 1); }
      else if (p === "3months") { start.setMonth(start.getMonth() - 3); }
      else if (p === "year") { start.setFullYear(start.getFullYear() - 1); }
      else if (p === "custom" && customStart && customEnd) {
        return { start: new Date(customStart), end: new Date(customEnd + "T23:59:59") };
      }
      return { start, end };
    };

    const { start: periodStart, end: periodEnd } = getPeriodRange(period);
    const periodInteractions = interactions.filter((i) => {
      const d = new Date(i.date);
      return d >= periodStart && d <= periodEnd;
    });

    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    const prevStart = new Date(periodStart.getTime() - periodDuration);
    const prevEnd = new Date(periodStart.getTime());
    const prevInteractions = interactions.filter((i) => {
      const d = new Date(i.date);
      return d >= prevStart && d < prevEnd;
    });

    const pCloses = periodInteractions.filter((i) => i.result === "close").length;
    const prevCloses = prevInteractions.filter((i) => i.result === "close").length;
    const pAvgFeel = periodInteractions.length > 0
      ? periodInteractions.reduce((s, i) => s + i.feelingScore, 0) / periodInteractions.length : 0;
    const pCloseRate = periodInteractions.length > 0 ? (pCloses / periodInteractions.length) * 100 : 0;
    const prevCloseRate = prevInteractions.length > 0
      ? (prevInteractions.filter((i) => i.result === "close").length / prevInteractions.length) * 100 : 0;

    const periodDays = Math.ceil(periodDuration / 86400000);
    const useMonthly = periodDays > 180;
    const timeGroupLabel = useMonthly ? "mois" : "semaine";

    type Bucket = { label: string; interactions: any[] };
    let buckets: Bucket[];

    if (useMonthly) {
      const numMonths = Math.max(Math.ceil(periodDays / 30), 1);
      buckets = getMonthsData(periodInteractions, numMonths).map((m) => ({ label: m.label, interactions: m.interactions }));
    } else {
      const numWeeks = Math.max(Math.ceil(periodDays / 7), 1);
      buckets = getWeeksData(periodInteractions, numWeeks).map((w) => ({ label: getWeekLabel(w.weekStart), interactions: w.interactions }));
    }

    const closeRateTimeSeries = buckets.map((b) => {
      const total = b.interactions.length;
      const closes = b.interactions.filter((i) => i.result === "close").length;
      return { label: b.label, value: total > 0 ? Math.round((closes / total) * 100) : 0 };
    });
    const avgCloseRate = periodInteractions.length > 0
      ? Math.round((periodInteractions.filter((i) => i.result === "close").length / periodInteractions.length) * 100) : 0;

    const feelingTimeSeries = buckets.map((b) => {
      const avg = b.interactions.length > 0
        ? b.interactions.reduce((s, i) => s + i.feelingScore, 0) / b.interactions.length : 0;
      return { label: b.label, value: Math.round(avg * 10) / 10 };
    });
    const avgFeeling = periodInteractions.length > 0
      ? periodInteractions.reduce((s, i) => s + i.feelingScore, 0) / periodInteractions.length : 0;

    const activityBars = buckets.map((b) => ({ label: b.label, value: b.interactions.length }));

    const closes = periodInteractions.filter((i) => i.result === "close").length;
    const neutrals = periodInteractions.filter((i) => i.result === "neutral").length;
    const rejections = periodInteractions.filter((i) => i.result === "rejection").length;

    const direct = periodInteractions.filter((i) => i.type === "direct").length;
    const indirect = periodInteractions.filter((i) => i.type === "indirect").length;
    const situational = periodInteractions.filter((i) => i.type === "situational").length;

    const heatmapData: Record<string, number> = {};
    periodInteractions.forEach((i) => {
      const key = new Date(i.date).toISOString().slice(0, 10);
      heatmapData[key] = (heatmapData[key] || 0) + 1;
    });

    const unlockedBadges = gam.badges.filter((b) => {
      if (!b.unlockedAt) return false;
      const d = new Date(b.unlockedAt);
      return d >= periodStart && d <= periodEnd;
    });

    const total = periodInteractions.length;
    const allCloses = periodInteractions.filter((i) => i.result === "close").length;
    const cr = total > 0 ? allCloses / total : 0;
    const af = total > 0 ? periodInteractions.reduce((s, i) => s + i.feelingScore, 0) / total : 0;
    const skillScore = computeSkillScore({ totalInteractions: total, closeRate: cr, avgFeelingScore: af, streak: gam.streak });
    const skillRank = getSkillRank(skillScore);

    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    periodInteractions.forEach((i) => { dayTotals[new Date(i.date).getDay()]++; });
    const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    return {
      periodInteractions, prevInteractions, pCloses, prevCloses, pAvgFeel, pCloseRate, prevCloseRate,
      closeRateTimeSeries, avgCloseRate, feelingTimeSeries, avgFeeling,
      activityBars, timeGroupLabel,
      closes, neutrals, rejections, direct, indirect, situational,
      heatmapData, heatmapWeeks: Math.max(Math.ceil(periodDays / 7), 1), unlockedBadges,
      skillScore, skillRank, bestDay: dayNames[bestDayIdx],
    };
  }, [interactions, loaded, period, customStart, customEnd, gam]);

  if (!loaded || !analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const periodLabels: Record<Period, string> = { week: "7 jours", month: "30 jours", "3months": "3 mois", year: "1 an", custom: "Personnalisé" };

  const periodDescription = (() => {
    if (period === "custom" && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${new Date(customEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return periodLabels[period];
  })();

  const diff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? "+∞" : "=";
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const metrics = [
    { label: "Interactions", val: analytics.periodInteractions.length, prev: analytics.prevInteractions.length, color: "text-[var(--on-surface)]", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { label: "Closes", val: analytics.pCloses, prev: analytics.prevCloses, color: "text-emerald-400", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Taux close", val: `${Math.round(analytics.pCloseRate)}%`, prev: Math.round(analytics.prevCloseRate), numVal: Math.round(analytics.pCloseRate), color: "text-[var(--primary)]", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
    { label: "Ressenti", val: analytics.pAvgFeel > 0 ? analytics.pAvgFeel.toFixed(1) : "—", prev: null, color: "text-amber-400", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
    { label: "Jour favori", val: analytics.bestDay, prev: null, color: "text-[var(--tertiary)]", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
  ];

  return (
    <div ref={reportRef} className="px-4 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto animate-fade-in print:max-w-none print:px-6 print:py-4 print:text-[10px]">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#f59e0b] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Statistiques</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Analyse détaillée — <span className="capitalize font-medium text-[var(--on-surface)]">{periodDescription}</span></p>
        </div>
        <ExportButton targetRef={reportRef} />
      </div>

      {/* ─── Period Selector ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 p-1 rounded-[14px] bg-[var(--surface-high)] border border-[var(--border)]">
          {(["week", "month", "3months", "year", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 rounded-[10px] text-xs font-medium transition-all ${
                period === p
                  ? "bg-[var(--glass-bg)] backdrop-blur-sm text-[var(--on-surface)] shadow-sm border border-[var(--glass-border)]"
                  : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface)] outline-none focus:border-[var(--primary)] transition-colors" />
            <span className="text-xs text-[var(--outline)]">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface)] outline-none focus:border-[var(--primary)] transition-colors" />
          </div>
        )}
      </div>

      {/* Premium hint */}
      {!isPremium && (
        <div className="mb-6 px-4 py-3 rounded-[16px] glass-card border border-[var(--primary)]/15 flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="text-xs text-[var(--on-surface-variant)]">Données limitées à la semaine en cours. Passe à <span className="text-[var(--primary)] font-semibold">{PLAN_NAME_PRO}</span> pour l&apos;historique complet et l&apos;export PDF.</p>
        </div>
      )}

      {/* ─── Key Metrics Hero ─── */}
      <div className="relative rounded-[22px] overflow-hidden glass-card border border-[var(--glass-border)] mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/[0.03] to-[var(--primary)]/[0.03]" />
        <div className="relative grid grid-cols-2 lg:grid-cols-5">
          {metrics.map((m, i) => (
            <div key={m.label} className={`flex flex-col items-center py-5 gap-1 ${i < metrics.length - 1 ? "border-r border-[var(--glass-border)]" : ""} ${i >= 2 && i < 5 ? "hidden sm:flex" : ""}`}>
              <div className="w-9 h-9 rounded-[12px] bg-[var(--surface-high)] flex items-center justify-center mb-1">
                <svg className={`w-4 h-4 ${m.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                </svg>
              </div>
              <span className={`text-2xl font-bold font-[family-name:var(--font-grotesk)] ${m.color}`}>{m.val}</span>
              <span className="text-[10px] text-[var(--outline)] tracking-wide uppercase">{m.label}</span>
              {m.prev !== null && (
                <span className={`text-[10px] font-medium ${(m.numVal ?? (m.val as number)) >= m.prev ? "text-emerald-400" : "text-[#fb7185]"}`}>
                  {diff(m.numVal ?? (m.val as number), m.prev)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Heatmap ─── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Activité</h2>
        </div>
        <HeatmapChart data={analytics.heatmapData} weeks={analytics.heatmapWeeks} />
      </Card>

      {/* ─── Charts Row 1: Activity + Close Rate ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--tertiary)]/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[var(--tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--on-surface)]">Interactions / {analytics.timeGroupLabel}</h2>
            </div>
          </div>
          <BarChart data={analytics.activityBars} height={180} />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--on-surface)]">Taux de close / {analytics.timeGroupLabel}</h2>
            </div>
            <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-md bg-emerald-400/10">{analytics.avgCloseRate}% moy.</span>
          </div>
          <LineChart data={analytics.closeRateTimeSeries} color="#10b981" suffix="%" avgLine={analytics.avgCloseRate} height={180} />
        </Card>
      </div>

      {/* ─── Charts Row 2: Feeling + Donuts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--on-surface)]">Ressenti dans le temps</h2>
            </div>
            <span className="text-xs text-[var(--primary)] font-medium px-2 py-0.5 rounded-md bg-[var(--primary)]/10">{analytics.avgFeeling.toFixed(1)} moy.</span>
          </div>
          <LineChart data={analytics.feelingTimeSeries} color="#c084fc" avgLine={analytics.avgFeeling} height={180} />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Résultats</h2>
          </div>
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
      </div>

      {/* ─── Donut Types + Skill + Progression ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--tertiary)]/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Types d&apos;approche</h2>
          </div>
          <DonutChart
            segments={[
              { label: "Direct", value: analytics.direct, color: "#c084fc" },
              { label: "Indirect", value: analytics.indirect, color: "#818cf8" },
              { label: "Situationnel", value: analytics.situational, color: "#22d3ee" },
            ]}
            size={120}
            thickness={16}
            centerValue={String(analytics.periodInteractions.length)}
            centerLabel="total"
          />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Rang</h2>
          </div>
          <div className="flex flex-col items-center py-2">
            <div className="relative w-[88px] h-[88px] mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-highest)" strokeWidth="6" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#skill-gradient)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${(analytics.skillScore / 100) * 263.89} 263.89`} className="transition-all duration-1000" />
                <defs>
                  <linearGradient id="skill-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--secondary)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-[var(--on-surface)] font-[family-name:var(--font-grotesk)]">{analytics.skillScore}</span>
              </div>
            </div>
            <span className={`text-sm font-bold ${SKILL_RANK_COLORS[analytics.skillRank]}`}>{SKILL_RANK_LABELS[analytics.skillRank]}</span>
            <span className="text-[10px] text-[var(--outline)] mt-1">Score global /100</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
              <IconFlame size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Progression</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Niveau", value: gam.level, color: "text-[var(--primary)]" },
              { label: "XP total", value: gam.xp.toLocaleString(), color: "text-[var(--tertiary)]" },
              { label: "Streak", value: `${gam.streak}j`, color: "text-amber-400", icon: true },
              { label: "Best streak", value: `${gam.bestStreak}j`, color: "text-amber-400/60" },
              { label: "Missions", value: completedMissions.length, color: "text-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-xs text-[var(--on-surface-variant)]">{item.label}</span>
                <span className={`text-sm font-bold ${item.color} flex items-center gap-1`}>
                  {item.icon && <IconFlame size={13} />}
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Badges ─── */}
      {analytics.unlockedBadges.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400/15 to-orange-400/15 flex items-center justify-center">
              <IconAward size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Badges débloqués sur la période</h2>
            <span className="text-[10px] text-[var(--outline)] ml-auto">{analytics.unlockedBadges.length} badge{analytics.unlockedBadges.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analytics.unlockedBadges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400/8 to-orange-400/8 border border-amber-400/15">
                <span className="text-base">{b.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[var(--on-surface)]">{b.name}</p>
                  <p className="text-[9px] text-[var(--outline)]">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Benchmarks ─── */}
      {benchmarks && interactions.length > 0 && (
        <div className="mb-6">
          <BenchmarkCard
            benchmarks={benchmarks}
            userCloseRate={Math.round(analytics.pCloseRate)}
            userAvgFeeling={analytics.pAvgFeel}
            userLevel={gam.level}
          />
        </div>
      )}

      {/* ─── Pipeline Funnel ─── */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </div>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Entonnoir de conversion</h2>
        </div>
        {(() => {
          const funnelSteps: { key: string; label: string; color: string }[] = [
            { key: "total", label: "Total closes", color: "#c084fc" },
            { key: "contacted", label: "Contacté", color: "#22d3ee" },
            { key: "replied", label: "Répondu", color: "#818cf8" },
            { key: "date_planned", label: "Date planifié", color: "#f59e0b" },
            { key: "first_date", label: "Premier date", color: "#10b981" },
            { key: "kissclose", label: "Kiss close", color: "#f472b6" },
            { key: "fuckclose", label: "Fuck close", color: "#fb7185" },
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
            <div className="space-y-2.5">
              {funnelCounts.map((step, idx) => {
                const pct = total > 0 ? Math.round((step.count / total) * 100) : 0;
                const widthPct = Math.max((step.count / maxCount) * 100, 6);
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--on-surface-variant)] w-28 text-right shrink-0 font-medium">{step.label}</span>
                    <div className="flex-1 h-7 bg-[var(--surface-high)] rounded-xl overflow-hidden relative">
                      <div className="h-full rounded-xl transition-all duration-700" style={{ width: `${widthPct}%`, backgroundColor: step.color, boxShadow: `0 0 12px ${step.color}25` }} />
                      <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-[var(--on-surface)]">
                        {step.count}{idx > 0 ? ` (${pct}%)` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* ─── Bottom Row: Timing + Method ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Temps moyen par étape</h2>
          </div>
          {(() => {
            const steps = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose"];
            const stepLabels: Record<string, string> = { new: "Close → Contact", contacted: "Contact → Réponse", replied: "Réponse → Date", date_planned: "Date → 1er RDV", first_date: "1er → 2e RDV", second_date: "2e RDV → Kiss", kissclose: "Kiss → Fuck" };
            const durations: { label: string; avg: number }[] = [];

            contacts.forEach((c) => {
              const sorted = [...c.timeline].filter((e) => e.type === "status_change").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              for (let i = 1; i < sorted.length; i++) {
                const days = Math.floor((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000);
                const prevLabel = stepLabels[steps[i - 1]] || `Étape ${i}`;
                const existing = durations.find((d) => d.label === prevLabel);
                if (existing) { existing.avg = (existing.avg + days) / 2; }
                else { durations.push({ label: prevLabel, avg: days }); }
              }
            });

            if (durations.length === 0) return <p className="text-xs text-[var(--outline)] py-2">Pas assez de données</p>;
            return (
              <div className="space-y-2.5">
                {durations.slice(0, 6).map((d) => (
                  <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-xs text-[var(--on-surface-variant)]">{d.label}</span>
                    <span className="text-xs font-bold text-[var(--primary)] px-2 py-0.5 rounded-md bg-[var(--primary)]/8">{d.avg.toFixed(1)}j</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--tertiary)]/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Taux de réponse par méthode</h2>
          </div>
          {(() => {
            const methods = ["instagram", "phone", "other"] as const;
            const methodLabels = { instagram: "Instagram", phone: "Téléphone", other: "Autre" };
            const methodColors = { instagram: "#E1306C", phone: "#10b981", other: "#818cf8" };
            const stats = methods.map((m) => {
              const total = contacts.filter((c) => c.method === m).length;
              const replied = contacts.filter((c) => c.method === m && ["replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"].includes(c.status)).length;
              return { method: m, label: methodLabels[m], color: methodColors[m], total, replied, rate: total > 0 ? Math.round((replied / total) * 100) : 0 };
            }).filter((s) => s.total > 0);

            if (stats.length === 0) return <p className="text-xs text-[var(--outline)] py-2">Pas assez de données</p>;
            return (
              <div className="space-y-4">
                {stats.map((s) => (
                  <div key={s.method}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[var(--on-surface-variant)] font-medium">{s.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.rate}%</span>
                        <span className="text-[10px] text-[var(--outline)]">({s.replied}/{s.total})</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.rate}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}30` }} />
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
