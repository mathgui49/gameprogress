"use client";

interface HeatmapChartProps {
  /** Map of "YYYY-MM-DD" → count */
  data: Record<string, number>;
  weeks?: number;
}

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function HeatmapChart({ data, weeks = 12 }: HeatmapChartProps) {
  const today = new Date();
  const todayDay = today.getDay();
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
    const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const col = Math.floor(d / 7);
    cells.push({ date: key, count: data[key] || 0, col, row });
  }

  const maxCount = Math.max(...cells.map((c) => c.count), 1);
  const totalCols = Math.max(...cells.map((c) => c.col)) + 1;
  const totalInteractions = Object.values(data).reduce((s, v) => s + v, 0);
  const activeDays = Object.values(data).filter((v) => v > 0).length;

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  cells.forEach((cell) => {
    const d = new Date(cell.date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), col: cell.col });
      lastMonth = m;
    }
  });

  const getColor = (count: number): string => {
    if (count === 0) return "var(--surface-highest)";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return "#c084fc40";
    if (intensity <= 0.5) return "#c084fc70";
    if (intensity <= 0.75) return "#c084fca0";
    return "#c084fc";
  };

  const cellSize = 14;
  const cellGap = 3;
  const labelW = 28;

  return (
    <div className="overflow-x-auto no-scrollbar">
      {/* Month labels */}
      <div className="flex mb-1" style={{ paddingLeft: labelW }}>
        {monthLabels.map((m, i) => {
          const nextCol = monthLabels[i + 1]?.col ?? totalCols;
          const span = nextCol - m.col;
          return (
            <div key={i} className="text-[10px] text-[var(--outline)] font-medium capitalize"
              style={{ width: span * (cellSize + cellGap), minWidth: span * (cellSize + cellGap) }}>
              {m.label}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col shrink-0" style={{ width: labelW, gap: cellGap }}>
          {DAYS.map((day, i) => (
            <div key={i} className="flex items-center justify-end pr-1.5 text-[9px] text-[var(--outline)] font-medium"
              style={{ height: cellSize }}>
              {i % 2 === 0 ? day : ""}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="flex" style={{ gap: cellGap }}>
          {Array.from({ length: totalCols }, (_, col) => (
            <div key={col} className="flex flex-col" style={{ gap: cellGap }}>
              {Array.from({ length: 7 }, (_, row) => {
                const cell = cells.find((c) => c.col === col && c.row === row);
                if (!cell) return <div key={row} style={{ width: cellSize, height: cellSize }} />;
                const isToday = cell.date === today.toISOString().slice(0, 10);
                return (
                  <div
                    key={row}
                    className={`rounded-[3px] transition-all duration-200 cursor-default ${isToday ? "ring-1 ring-[var(--primary)]" : ""}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(cell.count),
                    }}
                    title={`${new Date(cell.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}: ${cell.count} interaction${cell.count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-3 text-[10px] text-[var(--outline)]">
          <span>{totalInteractions} interaction{totalInteractions !== 1 ? "s" : ""}</span>
          <span className="text-[var(--border)]">·</span>
          <span>{activeDays} jour{activeDays !== 1 ? "s" : ""} actif{activeDays !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[var(--outline)]">Moins</span>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className="rounded-[3px]"
              style={{
                width: 10,
                height: 10,
                backgroundColor: level === 0 ? "var(--surface-highest)" : getColor(Math.ceil(maxCount * level)),
              }}
            />
          ))}
          <span className="text-[9px] text-[var(--outline)]">Plus</span>
        </div>
      </div>
    </div>
  );
}
