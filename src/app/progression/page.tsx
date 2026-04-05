"use client";

import { useEffect, useRef } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { useJournal } from "@/hooks/useJournal";
import { useWingRequests } from "@/hooks/useWingRequests";
import { useMissions } from "@/hooks/useMissions";
import { computeSkillScore, getSkillRank, SKILL_RANK_LABELS, SKILL_RANK_COLORS } from "@/types";
import { BADGE_CATEGORIES } from "@/lib/seed";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconFlame, IconAward, IconTrendingUp, IconLock, IconTarget } from "@/components/ui/Icons";

export default function ProgressionPage() {
  const gam = useGamification();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();
  const { sessions } = useSessions();
  const { entries: journal } = useJournal();
  const { wingProfiles } = useWingRequests();
  const { missions } = useMissions();
  const syncedRef = useRef(false);

  // Compute real values for badge categories
  const totalInteractions = interactions.length;
  const closes = interactions.filter((i) => i.result === "close").length;
  const dates = contacts.filter((c) => ["date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"].includes(c.status)).length;
  const completedMissions = missions.filter((m) => m.completed).length;
  const wingsCount = wingProfiles.length;
  const journalCount = journal.length;
  const sessionCount = sessions.length;
  const contactCount = contacts.length;

  const categoryValues: Record<string, number> = {
    interactions: totalInteractions,
    closes,
    dates,
    sessions: sessionCount,
    wings: wingsCount,
    streak: gam.bestStreak,
    journal: journalCount,
    contacts: contactCount,
    missions: completedMissions,
    level: gam.level,
  };

  // Auto-sync legacy milestones and badges
  useEffect(() => {
    if (!gam.loaded || syncedRef.current) return;
    syncedRef.current = true;

    const milestoneValues: Record<string, number> = {
      m1: totalInteractions, m2: totalInteractions, m3: totalInteractions,
      m4: closes, m5: closes, m6: closes,
      m7: dates, m8: dates,
      m9: sessionCount, m10: sessionCount,
      m11: journalCount, m12: journalCount,
      m13: wingsCount,
      m14: gam.bestStreak,
      m15: gam.level,
      m16: contactCount,
    };

    for (const [id, value] of Object.entries(milestoneValues)) {
      const existing = gam.milestones.find((m) => m.id === id);
      if (existing && existing.current !== value) {
        gam.updateMilestone(id, value);
      }
    }

    const badgeConditions: Record<string, boolean> = {
      b1: totalInteractions >= 1, b2: totalInteractions >= 10, b7: totalInteractions >= 50,
      b3: closes >= 1, b4: closes >= 5,
      b5: gam.bestStreak >= 7, b6: gam.bestStreak >= 30,
      b8: completedMissions >= 1,
      b9: sessionCount >= 1, b10: sessionCount >= 10,
      b11: journalCount >= 1, b12: journalCount >= 20,
      b13: wingsCount >= 1, b14: wingsCount >= 5,
      b15: contactCount >= 1, b16: dates >= 1,
      b17: gam.level >= 5, b18: gam.level >= 10,
    };

    for (const [id, met] of Object.entries(badgeConditions)) {
      const existing = gam.badges.find((b) => b.id === id);
      if (met && existing && !existing.unlockedAt) {
        gam.unlockBadge(id);
      }
    }
  }, [gam.loaded, interactions, contacts, sessions, journal, wingProfiles, missions]);

  if (!gam.loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const closeRate = totalInteractions > 0 ? closes / totalInteractions : 0;
  const avgFeeling = totalInteractions > 0 ? interactions.reduce((s, i) => s + i.feelingScore, 0) / totalInteractions : 0;

  const skillScore = computeSkillScore({ totalInteractions, closeRate, avgFeelingScore: avgFeeling, streak: gam.streak });
  const skillRank = getSkillRank(skillScore);

  // Compute progressive badge state per category
  const totalUnlocked = BADGE_CATEGORIES.reduce((sum, cat) => {
    const val = categoryValues[cat.key] ?? 0;
    return sum + cat.tiers.filter((t) => val >= t.threshold).length;
  }, 0);
  const totalTiers = BADGE_CATEGORIES.reduce((sum, cat) => sum + cat.tiers.length, 0);

  // Ring styles
  const skillRingStyle = {
    background: `conic-gradient(var(--primary-container) ${skillScore * 3.6}deg, var(--secondary-container) ${skillScore * 3.6}deg ${skillScore * 3.6 + 1}deg, var(--neon-purple) ${skillScore * 3.6 + 1}deg)`,
  };
  const xpRingStyle = {
    background: `conic-gradient(var(--tertiary-dim) ${gam.xpProgress * 3.6}deg, var(--primary-container) ${gam.xpProgress * 3.6}deg ${gam.xpProgress * 3.6 + 1}deg, var(--neon-blue) ${gam.xpProgress * 3.6 + 1}deg)`,
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] via-[#f472b6] to-[#818cf8] bg-clip-text text-transparent">Progression</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Ton parcours de progression</p>
      </div>

      {/* Skill Rating hero with conic ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--tertiary)]/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider mb-1 font-[family-name:var(--font-grotesk)]">Rang de compétence</p>
              <p className={`text-2xl font-bold font-[family-name:var(--font-grotesk)] ${SKILL_RANK_COLORS[skillRank]}`}>{SKILL_RANK_LABELS[skillRank]}</p>
            </div>
            {/* Frosted conic ring for skill score */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(192,132,252,0.25)]" style={skillRingStyle} />
              <div className="absolute inset-[4px] rounded-full bg-[var(--surface)] flex items-center justify-center">
                <span className="text-xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{skillScore}</span>
              </div>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--surface-highest)] overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-700 shadow-[0_0_12px_rgba(192,132,252,0.4)]" style={{ width: `${skillScore}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tooltip text="Pourcentage d'interactions conclues — pese 40% du score" position="bottom">
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--on-surface)]">{(closeRate * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-[var(--outline)]">Close rate (40%)</p>
              </div>
            </Tooltip>
            <Tooltip text="Moyenne de ton ressenti après chaque interaction — pèse 25%" position="bottom">
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--on-surface)]">{avgFeeling.toFixed(1)}</p>
                <p className="text-[10px] text-[var(--outline)]">Ressenti moy. (25%)</p>
              </div>
            </Tooltip>
            <Tooltip text="Nombre total d'interactions enregistrées — pèse 18%" position="bottom">
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--on-surface)]">{totalInteractions}</p>
                <p className="text-[10px] text-[var(--outline)]">Volume (18%)</p>
              </div>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Level + XP with conic ring */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--tertiary)]/5 to-[var(--primary)]/5" />
        <div className="relative flex items-center gap-6">
          {/* Conic ring */}
          <div className="relative w-20 h-20 shrink-0">
            <div className="absolute inset-0 rounded-full shadow-[0_0_16px_rgba(129,140,248,0.2)]" style={xpRingStyle} />
            <div className="absolute inset-[4px] rounded-full bg-[var(--surface)] flex items-center justify-center">
              <span className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{gam.level}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider mb-1">Niveau {gam.level}</p>
            <p className="text-lg font-bold text-[var(--on-surface)] mb-2">{gam.xp} / {gam.xpForNext} XP</p>
            <div className="w-full h-3 rounded-full bg-[var(--surface-highest)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--tertiary)] to-[var(--primary)] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(129,140,248,0.4)]"
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
            <IconFlame size={20} className="text-[var(--primary)]" />
            <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--primary)]">{gam.streak}</p>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)]">Streak actuel</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: Math.min(gam.streak, 7) }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-[0_0_6px_rgba(192,132,252,0.5)]" />
            ))}
          </div>
        </Card>
        <Card className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <IconTrendingUp size={20} className="text-[var(--tertiary)]" />
            <p className="text-3xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--tertiary)]">{gam.bestStreak}</p>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)]">Meilleur streak</p>
          <p className="text-[10px] text-[var(--outline)] mt-2">Record personnel</p>
        </Card>
      </div>

      {/* Progressive Badges */}
      <div>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Badges ({totalUnlocked}/{totalTiers})</h2>
        <div className="space-y-3">
          {BADGE_CATEGORIES.map((cat) => {
            const value = categoryValues[cat.key] ?? 0;
            // Find highest unlocked tier and next tier
            let currentTierIdx = -1;
            for (let i = cat.tiers.length - 1; i >= 0; i--) {
              if (value >= cat.tiers[i].threshold) { currentTierIdx = i; break; }
            }
            const currentTier = currentTierIdx >= 0 ? cat.tiers[currentTierIdx] : null;
            const nextTier = currentTierIdx < cat.tiers.length - 1 ? cat.tiers[currentTierIdx + 1] : null;
            const maxed = currentTierIdx === cat.tiers.length - 1;

            // Progress bar: from current tier threshold to next tier threshold
            const prevThreshold = currentTier ? currentTier.threshold : 0;
            const nextThreshold = nextTier ? nextTier.threshold : prevThreshold;
            const progressRange = nextThreshold - prevThreshold;
            const pct = nextTier && progressRange > 0
              ? Math.min(((value - prevThreshold) / progressRange) * 100, 100)
              : maxed ? 100 : 0;

            return (
              <Card key={cat.id} className="!p-4">
                <div className="flex items-center gap-3">
                  {/* Current badge icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl ${currentTier ? (maxed ? "bg-amber-400/10" : "bg-[var(--primary)]/10") : "bg-[var(--outline-variant)]/10"}`}>
                    {currentTier ? currentTier.icon : <IconLock size={18} className="text-[var(--on-surface-variant)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider font-[family-name:var(--font-grotesk)]">{cat.label}</p>
                        {currentTier && (
                          <span className={`text-xs font-semibold ${maxed ? "text-amber-400" : "text-[var(--on-surface)]"}`}>{currentTier.name}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--outline)] shrink-0">
                        {maxed ? "MAX" : nextTier ? `${value}/${nextTier.threshold}` : `${value}/${cat.tiers[0].threshold}`}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${maxed ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]" : "bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* Tier dots */}
                    {nextTier && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-[var(--outline)]">Prochain :</span>
                        <span className="text-[10px] font-medium text-[var(--on-surface-variant)]">{nextTier.icon} {nextTier.name}</span>
                      </div>
                    )}
                    {maxed && (
                      <p className="text-[10px] text-amber-400 mt-1">Rang maximum atteint !</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
