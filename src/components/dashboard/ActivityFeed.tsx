import type { Interaction } from "@/types";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS } from "@/types";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface ActivityFeedProps {
  interactions: Interaction[];
}

export function ActivityFeed({ interactions }: ActivityFeedProps) {
  if (interactions.length === 0) {
    return <div className="text-center py-8 text-[#484849] text-sm">Aucune activite recente</div>;
  }

  return (
    <div className="space-y-1">
      {interactions.slice(0, 8).map((interaction) => (
        <Link
          key={interaction.id}
          href={`/interactions/${interaction.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#85adff]/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[#85adff]">{interaction.feelingScore}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium truncate">{interaction.firstName || "Anonyme"}</span>
              <span className="text-[10px] text-[#484849]">{APPROACH_LABELS[interaction.type]}</span>
            </div>
          </div>
          <Badge className={RESULT_COLORS[interaction.result]}>{RESULT_LABELS[interaction.result]}</Badge>
          <span className="text-[10px] text-[#484849] shrink-0">{formatRelative(interaction.date)}</span>
        </Link>
      ))}
    </div>
  );
}
