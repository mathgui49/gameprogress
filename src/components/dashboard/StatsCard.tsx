import { Card } from "@/components/ui/Card";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  icon?: string;
}

export function StatsCard({ label, value, subtitle, accent, icon }: StatsCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-medium text-[#adaaab] uppercase tracking-wider">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accent ? "text-[#85adff]" : "text-white"}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-[#484849] mt-1">{subtitle}</p>}
    </Card>
  );
}
