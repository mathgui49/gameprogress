"use client";

import Link from "next/link";
import type { Interaction } from "@/types";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS, TYPE_COLORS } from "@/types";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function InteractionCard({ interaction }: { interaction: Interaction }) {
  const displayName = interaction.firstName || interaction.memorableElement || "Anonyme";
  const subtitle = interaction.firstName && interaction.memorableElement ? interaction.memorableElement : null;

  return (
    <Link href={`/interactions/${interaction.id}`}>
      <Card hover className="group !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white truncate">{displayName}</h3>
              <Badge className={TYPE_COLORS[interaction.type]}>{APPROACH_LABELS[interaction.type]}</Badge>
            </div>
            {subtitle && <p className="text-[10px] text-[#ac8aff] mb-1 italic">{subtitle}</p>}
            {interaction.note && <p className="text-xs text-[#adaaab] mb-2 line-clamp-2">{interaction.note}</p>}
            <div className="flex items-center gap-3 text-[10px] text-[#484849]">
              {interaction.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {interaction.location}
                </span>
              )}
              <span>{formatRelative(interaction.date)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={RESULT_COLORS[interaction.result]}>{RESULT_LABELS[interaction.result]}</Badge>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#85adff]/10 flex flex-col items-center justify-center" title="Ressenti">
                <span className="text-xs font-bold text-[#85adff]">{interaction.feelingScore}</span>
              </div>
              {interaction.womanScore != null && interaction.womanScore > 0 && (
                <div className="w-8 h-8 rounded-lg bg-[#ac8aff]/10 flex flex-col items-center justify-center" title="Note fille">
                  <span className="text-xs font-bold text-[#ac8aff]">{interaction.womanScore}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
