"use client";

interface HeatmapChartProps {
  /** Map of "YYYY-MM-DD" → count */
  data: Record<string, number>;
  weeks?: number;
}

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function HeatmapChart({ data, weeks = 12 }: HeatmapChartProps) {
  const today = new Date();
  const todayDay = today.getDay(); // 0=Sun
  // Adjust to Monday-based week
  const mondayOffset = todayDay === 0 ? 6 : todayDay - 1;

  const totalDays = weeks * 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1 - mondayOffset);

  const cells: { date: string; count: number; col: number; row: number }[] = [];
  for (let d = 0; d < totalDays + mondayOffset + 1; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    if (date > today) break;
    const key = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();
    const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
    const col = Math.floor(d / 7);
    cells.push({ date: key, count: data[key] || 0, col, row });
  }

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  const getOpacity = (count: number) => {
    if (count === 0) return 0;
    return 0.2 + (count / maxCount) * 0.8;
  };

  return (
    <div>
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAYS.map((day, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-[var(--outline)]">
              {i % 2 === 0 ? day : ""}
            </div>
          ))}
        </div>
        {/* Grid */}
        {Array.from({ length: Math.max(...cells.map((c) => c.col)) + 1 }, (_, col) => (
          <div key={col} className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }, (_, row) => {
              const cell = cells.find((c) => c.col === col && c.row === row);
              if (!cell) return <div key={row} className="w-3 h-3" />;
              return (
                <div
                  key={row}
                  className="w-3 h-3 rounded-[2px] transition-all duration-200"
                  style={{
                    backgroundColor: cell.count > 0 ? "#c084fc" : "var(--surface-highest)",
                    opacity: cell.count > 0 ? getOpacity(cell.count) : 1,
                  }}
                  title={`${cell.date}: ${cell.count} interaction${cell.count !== 1 ? "s" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[8px] text-[var(--outline)]">Moins</span>
        {[0, 0.25, 0.5, 0.75, 1].map((opacity) => (
          <div
            key={opacity}
            className="w-2.5 h-2.5 rounded-[2px]"
            style={{
              backgroundColor: opacity === 0 ? "var(--surface-highest)" : "#c084fc",
              opacity: opacity === 0 ? 1 : 0.2 + opacity * 0.8,
            }}
          />
        ))}
        <span className="text-[8px] text-[var(--outline)]">Plus</span>
      </div>
    </div>
  );
}
