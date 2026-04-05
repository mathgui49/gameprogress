"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSessions } from "@/hooks/useSessions";
import { useMissions } from "@/hooks/useMissions";
import { useContacts } from "@/hooks/useContacts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Session, Mission, Reminder } from "@/types";

type CalendarView = "month" | "week" | "day";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "session" | "reminder" | "mission_deadline";
  color: string;
  editable: boolean;
  source: Session | Mission | Reminder;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"];

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendrierPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { allSessions: sessions, update: updateSession } = useSessions();
  const { missions } = useMissions();
  const { contacts } = useContacts();

  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Collect all reminders from contacts
  const allReminders = useMemo(() => {
    const reminders: Reminder[] = [];
    contacts.forEach((c) => {
      c.reminders?.forEach((r) => { reminders.push({ ...r, contactId: c.id }); });
    });
    return reminders;
  }, [contacts]);

  // Build calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    const items: CalendarEvent[] = [];

    // Sessions
    sessions.forEach((s) => {
      const isOwn = true; // all sessions in useSessions are the user's own
      items.push({
        id: `session-${s.id}`,
        title: s.title || "Session",
        date: s.date,
        type: "session",
        color: s.isPublic ? "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/20" : "bg-[var(--tertiary)]/15 text-[var(--tertiary)] border-[#818cf8]/20",
        editable: isOwn,
        source: s,
      });
    });

    // Reminders
    allReminders.forEach((r) => {
      if (r.done) return;
      items.push({
        id: `reminder-${r.id}`,
        title: r.label,
        date: r.date,
        type: "reminder",
        color: "bg-amber-400/15 text-amber-400 border-amber-400/20",
        editable: true,
        source: r,
      });
    });

    // Mission deadlines
    missions.forEach((m) => {
      if (!m.deadline || m.completed) return;
      items.push({
        id: `mission-${m.id}`,
        title: `Mission: ${m.title}`,
        date: m.deadline,
        type: "mission_deadline",
        color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20",
        editable: true,
        source: m,
      });
    });

    return items;
  }, [sessions, allReminders, missions]);

  // Navigation
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  // Month grid
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  // Week grid
  const weekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getEventsForDay = (d: Date) => events.filter((e) => sameDay(new Date(e.date), d));

  const today = new Date();

  const renderEventPill = (e: CalendarEvent, compact = false) => (
    <button
      key={e.id}
      onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
      className={`block w-full text-left rounded-md border px-1.5 py-0.5 truncate transition-colors hover:brightness-125 ${e.color} ${compact ? "text-[8px]" : "text-[10px]"}`}
    >
      {!compact && <span className="mr-1">{e.type === "session" ? "📅" : e.type === "reminder" ? "⏰" : "🎯"}</span>}
      {e.title}
    </button>
  );

  return (
    <div className="px-4 py-2 lg:px-8 lg:py-4 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] tracking-tight mb-0.5">Calendrier</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            {view === "month" && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {view === "week" && `Semaine du ${weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
            {view === "day" && currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="text-[10px] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] px-2 py-1 rounded-lg hover:bg-[rgba(192,132,252,0.04)] transition-colors">Aujourd&apos;hui</button>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[rgba(192,132,252,0.04)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[rgba(192,132,252,0.04)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-4 bg-[var(--surface)] rounded-xl p-1 w-fit">
        {(["month", "week", "day"] as CalendarView[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-xs font-medium px-4 py-2 rounded-lg transition-all ${view === v ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
            {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" /><span className="text-[10px] text-[var(--on-surface-variant)]">Sessions</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[10px] text-[var(--on-surface-variant)]">Rappels</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-[var(--on-surface-variant)]">Deadlines</span></div>
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-[var(--surface)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] font-medium text-[var(--outline)] text-center py-2 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="min-h-[80px] bg-[var(--surface-low)] border-t border-r border-[rgba(192,132,252,0.04)]" />;
              const dayEvents = getEventsForDay(day);
              const isToday = sameDay(day, today);
              return (
                <div
                  key={i}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                  className={`min-h-[80px] p-1 border-t border-r border-[rgba(192,132,252,0.04)] cursor-pointer hover:bg-[rgba(192,132,252,0.03)] transition-colors ${isToday ? "bg-[var(--primary)]/5" : ""}`}
                >
                  <span className={`text-[11px] font-medium ${isToday ? "text-[var(--primary)] font-bold" : "text-[var(--on-surface-variant)]"}`}>{day.getDate()}</span>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((e) => renderEventPill(e, true))}
                    {dayEvents.length > 3 && <p className="text-[8px] text-[var(--outline)]">+{dayEvents.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-[var(--surface)]">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center py-2">
                <p className="text-[10px] text-[var(--outline)] uppercase">{WEEKDAYS[i]}</p>
                <p className={`text-sm font-medium ${sameDay(d, today) ? "text-[var(--primary)]" : "text-[var(--on-surface)]"}`}>{d.getDate()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((d, i) => {
              const dayEvents = getEventsForDay(d);
              return (
                <div
                  key={i}
                  onClick={() => { setCurrentDate(d); setView("day"); }}
                  className={`min-h-[120px] p-1.5 border-t border-r border-[rgba(192,132,252,0.04)] cursor-pointer hover:bg-[rgba(192,132,252,0.03)] ${sameDay(d, today) ? "bg-[var(--primary)]/5" : ""}`}
                >
                  <div className="space-y-1">
                    {dayEvents.map((e) => renderEventPill(e))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <Card>
          <h2 className="text-base font-semibold text-[var(--on-surface)] mb-4">
            {currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          {getEventsForDay(currentDate).length === 0 ? (
            <p className="text-sm text-[var(--outline)] text-center py-8">Aucun evenement ce jour.</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDay(currentDate).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors hover:brightness-110 ${e.color}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{e.type === "session" ? "📅" : e.type === "reminder" ? "⏰" : "🎯"}</span>
                      <span className="text-sm font-medium">{e.title}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{formatTime(e.date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Event detail modal */}
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title ?? ""}>
        {selectedEvent && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${selectedEvent.color}`}>
                {selectedEvent.type === "session" ? "Session" : selectedEvent.type === "reminder" ? "Rappel" : "Deadline mission"}
              </span>
            </div>
            <p className="text-sm text-[var(--on-surface-variant)]">
              {new Date(selectedEvent.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" a "}{formatTime(selectedEvent.date)}
            </p>

            {selectedEvent.type === "session" && (
              <div className="space-y-2 text-xs text-[var(--on-surface-variant)]">
                {(selectedEvent.source as Session).location && <p>Lieu : {(selectedEvent.source as Session).location}</p>}
                {(selectedEvent.source as Session).address && <p>Adresse : {(selectedEvent.source as Session).address}</p>}
                {(selectedEvent.source as Session).notes && <p>Notes : {(selectedEvent.source as Session).notes}</p>}
              </div>
            )}

            {selectedEvent.type === "mission_deadline" && (
              <div className="text-xs text-[var(--on-surface-variant)]">
                <p>Progression : {(selectedEvent.source as Mission).current}/{(selectedEvent.source as Mission).target}</p>
              </div>
            )}

            {!selectedEvent.editable && (
              <p className="text-[10px] text-[var(--outline)]">Cet evenement ne peut pas etre modifie (cree par un autre utilisateur).</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
