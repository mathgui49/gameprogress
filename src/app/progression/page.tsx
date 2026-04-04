"use client";

import { useGamification } from "@/hooks/useGamification";
import { useInteractions } from "@/hooks/useInteractions";
import { computeSkillScore, getSkillRank, SKILL_RANK_LABELS, SKILL_RANK_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";

export default function ProgressionPage() {
  const gam = useGamification();
  const { interactions } = useInteractions();

  if (!gam.loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  // Compute skill rating from real data
  const totalInteractions = interactions.length;
  const closes = interactions.filter((i) => i.result === "close").length;
  const closeRate = totalInteractions > 0 ? closes / totalInteractions : 0;
  const avgFeeling = totalInteractions > 0 ? interactions.reduce((s, i) => s + i.feelingScore, 0) / totalInteractions : 0;
  const withConfidence = interactions.filter((i) => (i.confidenceScore ?? 0) > 0);
  const avgConfidence = withConfidence.length > 0 ? withConfidence.reduce((s, i) => s + (i.confidenceScore ?? 0), 0) / withConfidence.length : 0;

  const skillScore = computeSkillScore({ totalInteractions, closeRate, avgFeelingScore: avgFeeling, avgConfidence, streak: gam.streak });
  const skillRank = getSkillRank(skillScore);

  const unlockedBadges = gam.badges.filter((b) => b.unlockedAt);
  const lockedBadges = gam.badges.filter((b) => !b.unlockedAt);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Progression</h1>
        <p className="text-sm text-[#adaaab]">Ton parcours de progression</p>
      </div>

      {/* Skill Rating hero */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ac8aff]/5 to-[#85adff]/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#adaaab] uppercase tracking-wider mb-1">Rang de competence</p>
              <p className={`text-2xl font-bold ${SKILL_RANK_COLORS[skillRank]}`}>{SKILL_RANK_LABELS[skillRank]}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ac8aff]/20 to-[#85adff]/20 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{skillScore}</span>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ac8aff] to-[#85adff] transition-all duration-700" style={{ width: `${skillScore}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{(closeRate * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-[#484849]">Close rate (40%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{avgFeeling.toFixed(1)}</p>
              <p className="text-[10px] text-[#484849]">Ressenti moy. (20%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{avgConfidence.toFixed(1)}</p>
              <p className="text-[10px] text-[#484849]">Confiance (15%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{totalInteractions}</p>
              <p className="text-[10px] text-[#484849]">Volume (15%)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Level + XP */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#85adff]/5 to-[#ac8aff]/5" />
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#85adff] to-[#ac8aff] flex items-center justify-center shadow-lg shadow-[#85adff]/20 animate-xp-pulse">
            <span className="text-2xl font-bold text-white">{gam.level}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#adaaab] uppercase tracking-wider mb-1">Niveau {gam.level}</p>
            <p className="text-lg font-bold text-white mb-2">{gam.xp} / {gam.xpForNext} XP</p>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#85adff] to-[#ac8aff] transition-all duration-700 ease-out"
                style={{ width: `${gam.xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#85adff] mb-1">{gam.streak}</p>
          <p className="text-xs text-[#adaaab]">Streak actuel</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: Math.min(gam.streak, 7) }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#85adff] to-[#ac8aff]" />
            ))}
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-[#ac8aff] mb-1">{gam.bestStreak}</p>
          <p className="text-xs text-[#adaaab]">Meilleur streak</p>
          <p className="text-[10px] text-[#484849] mt-2">Record personnel</p>
        </Card>
      </div>

      {/* Badges */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white mb-4">Badges ({unlockedBadges.length}/{gam.badges.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {unlockedBadges.map((b) => (
            <Card key={b.id} className="text-center !p-4">
              <span className="text-3xl mb-2 block">{b.icon}</span>
              <p className="text-xs font-semibold text-white mb-0.5">{b.name}</p>
              <p className="text-[10px] text-[#484849]">{b.description}</p>
            </Card>
          ))}
          {lockedBadges.map((b) => (
            <Card key={b.id} className="text-center !p-4 opacity-30">
              <span className="text-3xl mb-2 block grayscale">🔒</span>
              <p className="text-xs font-semibold text-[#adaaab] mb-0.5">{b.name}</p>
              <p className="text-[10px] text-[#484849]">{b.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Milestones</h2>
        <div className="space-y-3">
          {gam.milestones.map((m) => {
            const pct = Math.min((m.current / m.target) * 100, 100);
            const done = m.unlockedAt !== null;
            return (
              <Card key={m.id} className={`!p-4 ${done ? "" : "opacity-80"}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <span className="text-xs text-[#adaaab]">{m.current}/{m.target}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${done ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-[#85adff] to-[#ac8aff]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {done && <span className="text-emerald-400 text-xs font-medium">✓</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
