"use client";

import { useState, useMemo } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function SessionsPage() {
  const { sessions, loaded } = useSessions();
  const { interactions } = useInteractions();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }, [calMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<number, typeof sessions> = {};
    sessions.forEach((s) => {
      const d = new Date(s.date);
      if (d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth()) {
        const day = d.getDate();
        (map[day] ||= []).push(s);
      }
    });
    return map;
  }, [sessions, calMonth]);

  const monthLabel = calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Sessions</h1>
          <p className="text-sm text-[#adaaab]">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#131314] rounded-xl">
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "list" ? "bg-[#85adff]/15 text-[#85adff]" : "text-[#484849] hover:text-[#adaaab]"}`}>
              Liste
            </button>
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "calendar" ? "bg-[#85adff]/15 text-[#85adff]" : "text-[#484849] hover:text-[#adaaab]"}`}>
              Calendrier
            </button>
          </div>
          <Link href="/sessions/new"><Button>+ Session</Button></Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="Aucune session" description="Une session regroupe plusieurs interactions lors d'une sortie." action={<Link href="/sessions/new"><Button>Creer une session</Button></Link>} />
      ) : view === "list" ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const sessionInteractions = interactions.filter((i) => s.interactionIds.includes(i.id));
            const closes = sessionInteractions.filter((i) => i.result === "close").length;
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <Card hover className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-0.5">{s.title || "Session sans titre"}</h3>
                      <p className="text-xs text-[#484849]">{formatDate(s.date)} {s.location && `· ${s.location}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#85adff]/15 text-[#85adff]">{s.interactionIds.length} interactions</Badge>
                      {closes > 0 && <Badge className="bg-emerald-400/15 text-emerald-400">{closes} close{closes > 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                  {s.wings.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] text-[#484849]">Wings:</span>
                      {s.wings.map((w) => <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-[#262627] text-[#adaaab]">{w}</span>)}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Calendar view */
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="text-[#adaaab] hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <h2 className="text-sm font-semibold text-white capitalize">{monthLabel}</h2>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="text-[#adaaab] hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => <div key={d} className="text-center text-[10px] text-[#484849] font-medium py-1">{d}</div>)}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const daySessions = sessionsByDay[day] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth.getMonth() && new Date().getFullYear() === calMonth.getFullYear();
              return (
                <div key={day} className={`min-h-[60px] rounded-lg p-1 transition-all ${isToday ? "bg-[#85adff]/5 ring-1 ring-[#85adff]/20" : "hover:bg-white/[0.02]"}`}>
                  <p className={`text-[10px] font-medium mb-0.5 ${isToday ? "text-[#85adff]" : "text-[#adaaab]"}`}>{day}</p>
                  {daySessions.map((s) => (
                    <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                      <div className="text-[9px] px-1 py-0.5 rounded bg-[#85adff]/10 text-[#85adff] truncate mb-0.5 hover:bg-[#85adff]/20 transition-colors">
                        {s.title || "Session"}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
