import { Card } from "@/components/ui/Card";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}

export function StatsCard({ label, value, subtitle, accent, icon }: StatsCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-medium text-[#a09bb2] uppercase tracking-wider">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#c084fc]/10 flex items-center justify-center text-[#c084fc]">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accent ? "text-[#c084fc]" : "text-white"}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-[#6b6580] mt-1">{subtitle}</p>}
    </Card>
  );
}
