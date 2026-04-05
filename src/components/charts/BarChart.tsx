"use client";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  defaultColor?: string;
}

export function BarChart({ data, height = 160, defaultColor = "#818cf8" }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-[var(--outline)]" style={{ height }}>
        Aucune donnée
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const barColor = d.color || defaultColor;
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[10px] font-semibold text-[var(--on-surface-variant)]">
              {d.value > 0 ? d.value : ""}
            </span>
            <div className="w-full bg-[var(--surface-highest)] rounded-lg overflow-hidden flex flex-col justify-end"
              style={{ height: "calc(100% - 32px)" }}>
              <div
                className="w-full rounded-lg transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  minHeight: d.value > 0 ? "4px" : "0",
                  background: `linear-gradient(to top, ${barColor}, ${barColor}cc)`,
                }}
              />
            </div>
            <span className="text-[9px] text-[var(--outline)] truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
