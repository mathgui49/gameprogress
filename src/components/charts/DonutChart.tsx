"use client";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  size = 150,
  thickness = 20,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-xs text-[var(--outline)] py-6">
        Aucune donnée
      </div>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const gap = 3; // gap between segments in svg units

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {/* Background circle */}
          <circle cx={center} cy={center} r={radius} fill="none"
            stroke="var(--surface-highest)" strokeWidth={thickness} opacity="0.5" />
          {/* Segments */}
          {segments.filter((s) => s.value > 0).map((seg, i) => {
            const pct = seg.value / total;
            const gapPct = gap / circumference;
            const dashLength = Math.max(pct * circumference - gap, 0);
            const dashOffset = -(cumulativeOffset * circumference + gap / 2);
            cumulativeOffset += pct;
            return (
              <circle
                key={i}
                cx={center} cy={center} r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-700"
                style={{ filter: `drop-shadow(0 0 4px ${seg.color}30)` }}
              />
            );
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-bold text-[var(--on-surface)] font-[family-name:var(--font-grotesk)]">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] text-[var(--outline)] uppercase tracking-wider">{centerLabel}</span>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 min-w-0">
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-[4px] shrink-0" style={{ backgroundColor: seg.color, boxShadow: `0 0 6px ${seg.color}40` }} />
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="text-xs text-[var(--on-surface-variant)] truncate">{seg.label}</span>
                <div className="flex items-baseline gap-1 ml-auto shrink-0">
                  <span className="text-sm font-bold text-[var(--on-surface)] tabular-nums">{seg.value}</span>
                  <span className="text-[10px] text-[var(--outline)] tabular-nums">({pct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
