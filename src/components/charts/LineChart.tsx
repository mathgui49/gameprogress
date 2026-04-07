"use client";

import { useMemo } from "react";

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

function niceScale(min: number, max: number, ticks: number = 5): number[] {
  if (max === min) return [min];
  const range = max - min;
  const roughStep = range / (ticks - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceFractions = [1, 2, 2.5, 5, 10];
  const niceStep = niceFractions.find((f) => f * mag >= roughStep)! * mag;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const result: number[] = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    result.push(Math.round(v * 100) / 100);
  }
  return result;
}

export function LineChart({
  data,
  color = "#c084fc",
  height = 180,
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

  const viewW = 400;
  const viewH = height;
  const padding = { top: 24, right: 16, bottom: 36, left: 42 };
  const chartW = viewW - padding.left - padding.right;
  const chartH = viewH - padding.top - padding.bottom;

  const rawMin = Math.min(...data.map((d) => d.value));
  const rawMax = Math.max(...data.map((d) => d.value));
  const yTicks = niceScale(Math.min(rawMin, 0), rawMax, 5);
  const minVal = yTicks[0];
  const maxVal = yTicks[yTicks.length - 1];
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  // Smooth curve using cubic bezier
  const smoothPath = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  const areaPath = `${smoothPath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const avgY = avgLine !== undefined
    ? padding.top + chartH - ((avgLine - minVal) / range) * chartH
    : null;

  // Skip labels when too many
  const labelInterval = data.length > 12 ? Math.ceil(data.length / 8) : data.length > 6 ? 2 : 1;
  const gradientId = `line-area-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ height }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Y-axis grid lines + labels */}
      {yTicks.map((tick) => {
        const y = padding.top + chartH - ((tick - minVal) / range) * chartH;
        return (
          <g key={tick}>
            <line x1={padding.left} y1={y} x2={viewW - padding.right} y2={y}
              stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
            <text x={padding.left - 6} y={y + 3.5} textAnchor="end" fill="var(--outline)" fontSize="10" fontFamily="var(--font-inter)">
              {tick}{suffix}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      {showArea && <path d={areaPath} fill={`url(#${gradientId})`} />}

      {/* Main line */}
      <path d={smoothPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Average line */}
      {avgY !== null && (
        <>
          <line x1={padding.left} y1={avgY} x2={viewW - padding.right} y2={avgY}
            stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
          <rect x={viewW - padding.right + 4} y={avgY - 8} width={28} height={16} rx={4} fill="#f59e0b" fillOpacity="0.15" />
          <text x={viewW - padding.right + 18} y={avgY + 3.5}
            fill="#f59e0b" fontSize="9" fontWeight="600" textAnchor="middle" opacity="0.9">
            moy
          </text>
        </>
      )}

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} opacity="0.15" />
          <circle cx={p.x} cy={p.y} r="2.5" fill="var(--surface)" stroke={color} strokeWidth="1.5" />
          {/* Value tooltip above dot */}
          {(i === 0 || i === points.length - 1 || i % labelInterval === 0) && (
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--on-surface)" fontSize="9" fontWeight="600">
              {p.value % 1 === 0 ? p.value : p.value.toFixed(1)}{suffix}
            </text>
          )}
        </g>
      ))}

      {/* X labels */}
      {points.map((p, i) => {
        if (i % labelInterval !== 0 && i !== points.length - 1) return null;
        return (
          <text key={i} x={p.x} y={viewH - 8} textAnchor="middle" fill="var(--outline)" fontSize="9.5" fontFamily="var(--font-inter)">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
