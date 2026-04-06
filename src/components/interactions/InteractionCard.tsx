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
  const tags = interaction.tags ?? [];

  return (
    <Link href={`/interactions/${interaction.id}`}>
      <Card hover className="group !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[var(--on-surface)] truncate">{displayName}</h3>
              <Badge className={TYPE_COLORS[interaction.type]}>{APPROACH_LABELS[interaction.type]}</Badge>
            </div>
            {subtitle && <p className="text-[10px] text-[var(--tertiary)] mb-1 italic">{subtitle}</p>}
            {interaction.note && <p className="text-xs text-[var(--on-surface-variant)] mb-1.5 line-clamp-2">{interaction.note}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">#{t}</span>
                ))}
                {tags.length > 3 && <span className="text-[9px] text-[var(--outline)]">+{tags.length - 3}</span>}
              </div>
            )}
            <div className="flex items-center gap-3 text-[10px] text-[var(--outline)]">
              {interaction.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
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
              <div className="flex flex-col items-center gap-0.5" title="Ressenti">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-[var(--primary)]">{interaction.feelingScore}</span>
                </div>
                <span className="text-[8px] text-[var(--outline)] leading-none">Ressenti</span>
              </div>
              {interaction.womanScore != null && interaction.womanScore > 0 && (
                <div className="flex flex-col items-center gap-0.5" title="Note fille">
                  <div className="w-8 h-8 rounded-lg bg-[var(--tertiary)]/10 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-[var(--tertiary)]">{interaction.womanScore}</span>
                  </div>
                  <span className="text-[8px] text-[var(--outline)] leading-none">Fille</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
