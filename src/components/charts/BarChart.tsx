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

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = [1, 2, 2.5, 5, 10];
  for (const n of nice) {
    if (n * mag >= max) return n * mag;
  }
  return max;
}

export function BarChart({ data, height = 180, defaultColor = "#818cf8" }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-[var(--outline)]" style={{ height }}>
        Aucune donnée
      </div>
    );
  }

  const maxVal = niceMax(Math.max(...data.map((d) => d.value), 1));
  // Skip labels when too many
  const labelInterval = data.length > 12 ? Math.ceil(data.length / 8) : data.length > 6 ? 2 : 1;
  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-[28px] w-[32px] flex flex-col justify-between pointer-events-none">
        {yTicks.slice().reverse().map((tick) => (
          <span key={tick} className="text-[9px] text-[var(--outline)] text-right pr-1.5 leading-none">{tick}</span>
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-[34px] h-full flex flex-col">
        {/* Grid + bars */}
        <div className="relative flex-1 flex items-end gap-[3px]">
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yTicks.slice().reverse().map((tick) => (
              <div key={tick} className="w-full h-px border-b border-dashed border-[var(--border)]/40" />
            ))}
          </div>

          {/* Bars */}
          {data.map((d, i) => {
            const barColor = d.color || defaultColor;
            const pct = Math.max((d.value / maxVal) * 100, d.value > 0 ? 2 : 0);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end relative group z-10">
                {/* Value on hover */}
                {d.value > 0 && (
                  <span className="text-[9px] font-bold text-[var(--on-surface)] opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1">
                    {d.value}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-125 cursor-default"
                  style={{
                    height: `${pct}%`,
                    background: `linear-gradient(to top, ${barColor}, ${barColor}bb)`,
                    boxShadow: d.value > 0 ? `0 -2px 8px ${barColor}25` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X labels */}
        <div className="flex gap-[3px] pt-2">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              {(i % labelInterval === 0 || i === data.length - 1) && (
                <span className="text-[9px] text-[var(--outline)] truncate block">{d.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
