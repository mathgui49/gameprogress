import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";

interface StatsCardProps {
  label: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
}

export function StatsCard({ label, value, subtitle, accent, icon, tooltip }: StatsCardProps) {
  const content = (
    <Card className="w-full h-full">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-medium text-[var(--on-surface-variant)] uppercase tracking-wider">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-[10px] bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accent ? "text-[var(--primary)] neon-text-purple" : "text-[var(--on-surface)]"}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-[var(--outline)] mt-1">{subtitle}</p>}
    </Card>
  );

  if (tooltip) {
    return <Tooltip text={tooltip} position="bottom" className="w-full h-full">{content}</Tooltip>;
  }
  return content;
}
