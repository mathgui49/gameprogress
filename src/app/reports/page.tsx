"use client";

import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useGamification } from "@/hooks/useGamification";
import { useMissions } from "@/hooks/useMissions";
import { computeSkillScore, getSkillRank, SKILL_RANK_LABELS } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ReportsPage() {
  const { interactions, loaded } = useInteractions();
  const { contacts } = useContacts();
  const gam = useGamification();
  const { completed: completedMissions } = useMissions();

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

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

  const tmCloses = thisMonth.filter((i) => i.result === "close").length;
  const lmCloses = lastMonth.filter((i) => i.result === "close").length;
  const tmAvgFeel = thisMonth.length > 0 ? (thisMonth.reduce((s, i) => s + i.feelingScore, 0) / thisMonth.length).toFixed(1) : "—";
  const tmCloseRate = thisMonth.length > 0 ? Math.round((tmCloses / thisMonth.length) * 100) : 0;

  const diff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? "+∞" : "=";
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const unlockedBadges = gam.badges.filter((b) => {
    if (!b.unlockedAt) return false;
    const d = new Date(b.unlockedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Weekly activity chart data (last 4 weeks)
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
    const count = interactions.filter((int) => { const d = new Date(int.date); return d >= weekStart && d < weekEnd; }).length;
    return { label: `S-${i}`, count };
  }).reverse();
  const maxWeek = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Rapport mensuel</h1>
          <p className="text-sm text-[#adaaab] capitalize">{monthName}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
            Exporter PDF
          </span>
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Interactions", val: thisMonth.length, prev: lastMonth.length, accent: true },
          { label: "Closes", val: tmCloses, prev: lmCloses, accent: true },
          { label: "Taux close", val: `${tmCloseRate}%`, prev: null, accent: false },
          { label: "Ressenti moy.", val: tmAvgFeel, prev: null, accent: false },
        ].map((m) => (
          <Card key={m.label} className="!p-4">
            <p className="text-[10px] text-[#adaaab] uppercase tracking-wider mb-2">{m.label}</p>
            <p className={`text-2xl font-bold ${m.accent ? "text-[#85adff]" : "text-white"}`}>{m.val}</p>
            {m.prev !== null && (
              <p className={`text-[10px] mt-1 ${(m.val as number) >= m.prev ? "text-emerald-400" : "text-[#ff6e84]"}`}>
                {diff(m.val as number, m.prev)} vs mois dernier
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Weekly chart */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-white mb-4">Activite (4 semaines)</h2>
        <div className="flex items-end gap-3 h-32">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-black/30 rounded-lg overflow-hidden flex flex-col justify-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-[#85adff] to-[#ac8aff] transition-all duration-500"
                  style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count > 0 ? "8px" : "0" }}
                />
              </div>
              <span className="text-[10px] text-[#484849]">{w.label}</span>
              <span className="text-xs font-semibold text-[#adaaab]">{w.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Progression */}
        <Card>
          <h2 className="text-base font-semibold text-white mb-3">Progression</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#adaaab]">Niveau</span>
              <span className="text-sm font-bold text-[#85adff]">{gam.level}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#adaaab]">XP total</span>
              <span className="text-sm font-bold text-[#ac8aff]">{gam.xp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#adaaab]">Streak actuel</span>
              <span className="text-sm font-bold text-amber-400">🔥 {gam.streak}j</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#adaaab]">Missions completees</span>
              <span className="text-sm font-bold text-emerald-400">{completedMissions.length}</span>
            </div>
          </div>
        </Card>

        {/* Badges this month */}
        <Card>
          <h2 className="text-base font-semibold text-white mb-3">Badges obtenus</h2>
          {unlockedBadges.length === 0 ? (
            <p className="text-xs text-[#484849]">Aucun nouveau badge ce mois-ci</p>
          ) : (
            <div className="space-y-2">
              {unlockedBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="text-xl">{b.icon}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{b.name}</p>
                    <p className="text-[10px] text-[#484849]">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Type breakdown */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-white mb-3">Repartition ce mois</h2>
        <div className="grid grid-cols-3 gap-4">
          {(["direct", "indirect", "situational"] as const).map((t) => {
            const count = thisMonth.filter((i) => i.type === t).length;
            const labels = { direct: "Direct", indirect: "Indirect", situational: "Situationnel" };
            return (
              <div key={t} className="text-center">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-[#484849]">{labels[t]}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contacts */}
        <Card>
          <h2 className="text-base font-semibold text-white mb-3">Pipeline</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#adaaab]">Contacts actifs</span>
            <span className="text-sm font-bold text-[#ac8aff]">{contacts.filter((c) => c.status !== "archived").length}</span>
          </div>
        </Card>

        {/* Skill Rating */}
        <Card>
          <h2 className="text-base font-semibold text-white mb-3">Rang de competence</h2>
          {(() => {
            const total = interactions.length;
            const cls = interactions.filter((i) => i.result === "close").length;
            const cr = total > 0 ? cls / total : 0;
            const af = total > 0 ? interactions.reduce((s, i) => s + i.feelingScore, 0) / total : 0;
            const wc = interactions.filter((i) => (i.confidenceScore ?? 0) > 0);
            const ac = wc.length > 0 ? wc.reduce((s, i) => s + (i.confidenceScore ?? 0), 0) / wc.length : 0;
            const score = computeSkillScore({ totalInteractions: total, closeRate: cr, avgFeelingScore: af, avgConfidence: ac, streak: gam.streak });
            const rank = getSkillRank(score);
            return (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#adaaab]">{SKILL_RANK_LABELS[rank]}</span>
                <span className="text-sm font-bold text-[#ac8aff]">{score}/100</span>
              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
