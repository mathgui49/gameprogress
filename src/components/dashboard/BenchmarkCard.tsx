"use client";

import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CommunityBenchmarks } from "@/lib/db";

interface BenchmarkItem {
  label: string;
  userVal: number;
  communityVal: number;
  suffix?: string;
  tooltip: string;
}

interface BenchmarkCardProps {
  benchmarks: CommunityBenchmarks;
  userCloseRate: number;
  userAvgFeeling: number;
  userAvgConfidence: number;
  userLevel: number;
}

function ComparisonBar({ label, userVal, communityVal, suffix = "", tooltip }: BenchmarkItem) {
  const diff = communityVal > 0 ? userVal - communityVal : 0;
  const pct = communityVal > 0 ? Math.round((diff / communityVal) * 100) : 0;
  const positive = pct >= 0;
  const maxVal = Math.max(userVal, communityVal, 1);

  return (
    <Tooltip text={tooltip} position="top">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--on-surface-variant)]">{label}</span>
          <span className={`text-[10px] font-semibold ${positive ? "text-emerald-400" : "text-[#fb7185]"}`}>
            {pct >= 0 ? `+${pct}%` : `${pct}%`} vs communauté
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-[var(--outline)] w-8">Toi</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-700"
                  style={{ width: `${Math.min((userVal / maxVal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-[var(--on-surface)] w-10 text-right">
                {userVal}{suffix}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--outline)] w-8">Moy.</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--outline-variant)] transition-all duration-700"
                  style={{ width: `${Math.min((communityVal / maxVal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--outline)] w-10 text-right">
                {communityVal}{suffix}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

export function BenchmarkCard({ benchmarks, userCloseRate, userAvgFeeling, userAvgConfidence, userLevel }: BenchmarkCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">
          Vs communauté
        </h2>
        <span className="text-[10px] text-[var(--outline)] bg-[var(--surface-highest)] px-2 py-0.5 rounded-full">
          {benchmarks.totalUsers} joueur{benchmarks.totalUsers > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-4">
        <ComparisonBar
          label="Taux de close"
          userVal={userCloseRate}
          communityVal={benchmarks.avgCloseRate}
          suffix="%"
          tooltip="Pourcentage d'interactions conclues par un close"
        />
        <ComparisonBar
          label="Ressenti"
          userVal={Math.round(userAvgFeeling * 10) / 10}
          communityVal={benchmarks.avgFeelingScore}
          suffix="/10"
          tooltip="Score moyen de ton ressenti après chaque interaction"
        />
        <ComparisonBar
          label="Confiance"
          userVal={Math.round(userAvgConfidence * 10) / 10}
          communityVal={benchmarks.avgConfidence}
          suffix="/10"
          tooltip="Score moyen de confiance auto-évalué"
        />
        <ComparisonBar
          label="Niveau"
          userVal={userLevel}
          communityVal={benchmarks.avgLevel}
          tooltip="Ton niveau de gamification vs la moyenne"
        />
      </div>
    </Card>
  );
}
