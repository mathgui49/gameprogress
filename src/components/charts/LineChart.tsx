"use client";

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  suffix?: string;
  showDots?: boolean;
  showArea?: boolean;
  avgLine?: number;
}

export function LineChart({
  data,
  color = "#c084fc",
  height = 160,
  suffix = "",
  showDots = true,
  showArea = true,
  avgLine,
}: LineChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-[var(--outline)]" style={{ height }}>
        Pas assez de données
      </div>
    );
  }

  const padding = { top: 20, right: 12, bottom: 28, left: 8 };
  const width = 100; // percentage-based viewBox
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const avgY = avgLine !== undefined
    ? padding.top + chartH - ((avgLine - minVal) / range) * chartH
    : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`area-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        return (
          <line key={pct} x1={padding.left} y1={y} x2={width - padding.right} y2={y}
            stroke="var(--border)" strokeWidth="0.15" strokeDasharray="1 1" />
        );
      })}

      {/* Area */}
      {showArea && <path d={areaPath} fill={`url(#area-${color.replace("#", "")})`} />}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Average line */}
      {avgY !== null && (
        <>
          <line x1={padding.left} y1={avgY} x2={width - padding.right} y2={avgY}
            stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1.5 1" opacity="0.7" />
          <text x={width - padding.right + 1} y={avgY + 1.2}
            fill="#f59e0b" fontSize="3" fontWeight="600" opacity="0.8">
            moy
          </text>
        </>
      )}

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="1.2" fill="var(--surface-high)" stroke={color} strokeWidth="0.5" />
          <text x={p.x} y={p.y - 3} textAnchor="middle" fill="var(--on-surface-variant)" fontSize="2.8" fontWeight="500">
            {Math.round(p.value)}{suffix}
          </text>
        </g>
      ))}

      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fill="var(--outline)" fontSize="2.6">
          {p.label}
        </text>
      ))}
    </svg>
  );
}
