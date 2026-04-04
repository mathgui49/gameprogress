"use client";

import { useGamification } from "@/hooks/useGamification";
import { useInteractions } from "@/hooks/useInteractions";
import { computeSkillScore, getSkillRank, SKILL_RANK_LABELS, SKILL_RANK_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";
import { IconFlame, IconAward, IconTrendingUp, IconLock, IconTarget } from "@/components/ui/Icons";

export default function ProgressionPage() {
  const gam = useGamification();
  const { interactions } = useInteractions();

  if (!gam.loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

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

  // Ring styles
  const skillRingStyle = {
    background: `conic-gradient(#c084fc ${skillScore * 3.6}deg, #f472b6 ${skillScore * 3.6}deg ${skillScore * 3.6 + 1}deg, rgba(192,132,252,0.08) ${skillScore * 3.6 + 1}deg)`,
  };
  const xpRingStyle = {
    background: `conic-gradient(#818cf8 ${gam.xpProgress * 3.6}deg, #c084fc ${gam.xpProgress * 3.6}deg ${gam.xpProgress * 3.6 + 1}deg, rgba(129,140,248,0.08) ${gam.xpProgress * 3.6 + 1}deg)`,
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Progression</h1>
        <p className="text-sm text-[#a09bb2]">Ton parcours de progression</p>
      </div>

      {/* Skill Rating hero with conic ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c084fc]/5 to-[#818cf8]/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#a09bb2] uppercase tracking-wider mb-1 font-[family-name:var(--font-grotesk)]">Rang de competence</p>
              <p className={`text-2xl font-bold font-[family-name:var(--font-grotesk)] ${SKILL_RANK_COLORS[skillRank]}`}>{SKILL_RANK_LABELS[skillRank]}</p>
            </div>
            {/* Frosted conic ring for skill score */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(192,132,252,0.25)]" style={skillRingStyle} />
              <div className="absolute inset-[4px] rounded-full bg-[#14111c] flex items-center justify-center">
                <span className="text-xl font-[family-name:var(--font-grotesk)] font-bold text-white">{skillScore}</span>
              </div>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-700 shadow-[0_0_12px_rgba(192,132,252,0.4)]" style={{ width: `${skillScore}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{(closeRate * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-[#6b6580]">Close rate (40%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{avgFeeling.toFixed(1)}</p>
              <p className="text-[10px] text-[#6b6580]">Ressenti moy. (20%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{avgConfidence.toFixed(1)}</p>
              <p className="text-[10px] text-[#6b6580]">Confiance (15%)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{totalInteractions}</p>
              <p className="text-[10px] text-[#6b6580]">Volume (15%)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Level + XP with conic ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#818cf8]/5 to-[#c084fc]/5" />
        <div className="relative flex items-center gap-6">
          {/* Conic ring */}
          <div className="relative w-20 h-20 shrink-0">
            <div className="absolute inset-0 rounded-full shadow-[0_0_16px_rgba(129,140,248,0.2)]" style={xpRingStyle} />
            <div className="absolute inset-[4px] rounded-full bg-[#14111c] flex items-center justify-center">
              <span className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white">{gam.level}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#a09bb2] uppercase tracking-wider mb-1">Niveau {gam.level}</p>
            <p className="text-lg font-bold text-white mb-2">{gam.xp} / {gam.xpForNext} XP</p>
            <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#c084fc] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(129,140,248,0.4)]"
                style={{ width: `${gam.xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <IconFlame size={20} className="text-[#c084fc]" />
            <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[#c084fc]">{gam.streak}</p>
          </div>
          <p className="text-xs text-[#a09bb2]">Streak actuel</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: Math.min(gam.streak, 7) }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#c084fc] to-[#f472b6] shadow-[0_0_6px_rgba(192,132,252,0.5)]" />
            ))}
          </div>
        </Card>
        <Card className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <IconTrendingUp size={20} className="text-[#818cf8]" />
            <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[#818cf8]">{gam.bestStreak}</p>
          </div>
          <p className="text-xs text-[#a09bb2]">Meilleur streak</p>
          <p className="text-[10px] text-[#6b6580] mt-2">Record personnel</p>
        </Card>
      </div>

      {/* Badges */}
      <div className="mb-6">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Badges ({unlockedBadges.length}/{gam.badges.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {unlockedBadges.map((b) => (
            <Card key={b.id} className="text-center !p-4">
              <div className="w-10 h-10 rounded-xl bg-[#c084fc]/10 flex items-center justify-center mx-auto mb-2 text-[#c084fc]">
                <IconAward size={22} />
              </div>
              <p className="text-xs font-semibold text-white mb-0.5">{b.name}</p>
              <p className="text-[10px] text-[#6b6580]">{b.description}</p>
            </Card>
          ))}
          {lockedBadges.map((b) => (
            <Card key={b.id} className="text-center !p-4 opacity-30">
              <div className="w-10 h-10 rounded-xl bg-[#a09bb2]/10 flex items-center justify-center mx-auto mb-2 text-[#a09bb2]">
                <IconLock size={22} />
              </div>
              <p className="text-xs font-semibold text-[#a09bb2] mb-0.5">{b.name}</p>
              <p className="text-[10px] text-[#6b6580]">{b.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Milestones</h2>
        <div className="space-y-3">
          {gam.milestones.map((m) => {
            const pct = Math.min((m.current / m.target) * 100, 100);
            const done = m.unlockedAt !== null;
            return (
              <Card key={m.id} className={`!p-4 ${done ? "" : "opacity-80"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${done ? "bg-emerald-400/10 text-emerald-400" : "bg-[#c084fc]/10 text-[#c084fc]"}`}>
                    <IconTarget size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <span className="text-xs text-[#a09bb2]">{m.current}/{m.target}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${done ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-[#c084fc] to-[#f472b6]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {done && <span className="text-emerald-400 text-xs font-medium">&#10003;</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
