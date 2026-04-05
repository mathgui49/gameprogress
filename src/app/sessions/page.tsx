"use client";

import { useState, useMemo, useEffect } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { fetchSessionParticipantsWithProfilesAction } from "@/actions/db";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconCalendar } from "@/components/ui/Icons";
import Link from "next/link";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type SessionFilter = "all" | "private" | "public_mine" | "public_joined";
type SortMode = "date_desc" | "date_asc" | "proximity";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SessionsPage() {
  const { sessions, invitedSessions, allSessions, loaded } = useSessions();
  const { interactions } = useInteractions();
  const { profile: userProfile } = usePublicProfile();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [sort, setSort] = useState<SortMode>("date_desc");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [participantCounts, setParticipantCounts] = useState<Record<string, { count: number; names: string[]; photos: (string | null)[] }>>({});

  const invitedIds = useMemo(() => new Set(invitedSessions.map((s) => s.id)), [invitedSessions]);

  // Fetch participant counts for all sessions
  useEffect(() => {
    allSessions.forEach((s) => {
      if (participantCounts[s.id]) return;
      fetchSessionParticipantsWithProfilesAction(s.id).then((parts) => {
        const accepted = parts.filter((p: any) => p.status === "accepted");
        setParticipantCounts((prev) => ({
          ...prev,
          [s.id]: {
            count: accepted.length,
            names: accepted.map((p: any) => p.profile?.username || p.profile?.firstName || "?"),
            photos: accepted.map((p: any) => p.profile?.profilePhoto || null),
          },
        }));
      });
    });
  }, [allSessions]);

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    return allSessions.map((s) => {
      const isJoined = invitedIds.has(s.id);
      const category: SessionFilter = !s.isPublic ? "private" : isJoined ? "public_joined" : "public_mine";
      const userLat = userProfile?.lat;
      const userLng = userProfile?.lng;
      const distanceKm = (userLat && userLng && s.lat && s.lng) ? Math.round(haversineKm(userLat, userLng, s.lat, s.lng)) : null;
      const isPast = new Date(s.date).getTime() < Date.now() - 4 * 3600 * 1000;
      return { ...s, category, distanceKm, isPast };
    });
  }, [allSessions, invitedIds, userProfile]);

  // Filter
  const filtered = useMemo(() => {
    let list = categorizedSessions;
    if (filter !== "all") list = list.filter((s) => s.category === filter);
    // Sort
    if (sort === "date_desc") list = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sort === "date_asc") list = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sort === "proximity") list = [...list].sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    return list;
  }, [categorizedSessions, filter, sort]);

  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }, [calMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<number, typeof allSessions> = {};
    allSessions.forEach((s) => {
      const d = new Date(s.date);
      if (d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth()) {
        const day = d.getDate();
        (map[day] ||= []).push(s);
      }
    });
    return map;
  }, [allSessions, calMonth]);

  const monthLabel = calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const categoryLabel = (cat: string) => {
    if (cat === "private") return "Privée";
    if (cat === "public_mine") return "Publique";
    if (cat === "public_joined") return "Rejoint";
    return "";
  };
  const categoryColor = (cat: string) => {
    if (cat === "private") return "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]";
    if (cat === "public_mine") return "bg-[var(--primary)]/15 text-[var(--primary)]";
    if (cat === "public_joined") return "bg-emerald-400/15 text-emerald-400";
    return "";
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">Sessions</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{allSessions.length} session{allSessions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-xl">
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "list" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
              Liste
            </button>
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "calendar" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
              Calendrier
            </button>
          </div>
          <Link href="/sessions/new"><Button>+ Session</Button></Link>
        </div>
      </div>

      {/* Filters & Sort */}
      {view === "list" && allSessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(["all", "private", "public_mine", "public_joined"] as SessionFilter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${filter === f ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}>
              {f === "all" ? "Toutes" : f === "private" ? "Privées" : f === "public_mine" ? "Publiques" : "Rejointes"}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-[var(--outline)]">Tri:</span>
            {(["date_desc", "date_asc", "proximity"] as SortMode[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`text-[10px] px-2 py-1 rounded-lg transition-all ${sort === s ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
                {s === "date_desc" ? "Récent" : s === "date_asc" ? "Ancien" : "Proximité"}
              </button>
            ))}
          </div>
        </div>
      )}

      {allSessions.length === 0 ? (
        <EmptyState icon={<IconCalendar size={28} />} title="Aucune session" description="Une session regroupe plusieurs interactions lors d'une sortie." action={<Link href="/sessions/new"><Button>Créer une session</Button></Link>} />
      ) : view === "list" ? (
        <div className="space-y-3">
          {filtered.map((s) => {
            const sessionInteractions = interactions.filter((i) => s.interactionIds.includes(i.id));
            const closes = sessionInteractions.filter((i) => i.result === "close").length;
            const pInfo = participantCounts[s.id];
            const isFuture = new Date(s.date).getTime() > Date.now();
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <Card hover className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session sans titre"}</h3>
                        <Badge className={categoryColor(s.category)}>{categoryLabel(s.category)}</Badge>
                        {isFuture && <Badge className="bg-cyan-400/15 text-cyan-400">Planifiée</Badge>}
                        {s.isPast && <Badge className="bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]">Archivée</Badge>}
                      </div>
                      <p className="text-xs text-[var(--outline)]">
                        {formatDate(s.date)} {s.location && `· ${s.location}`}
                        {s.distanceKm !== null && ` · ${s.distanceKm} km`}
                      </p>
                    </div>
                    {!isFuture && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">{s.interactionIds.length} inter.</Badge>
                        {closes > 0 && <Badge className="bg-emerald-400/15 text-emerald-400">{closes} close{closes > 1 ? "s" : ""}</Badge>}
                      </div>
                    )}
                  </div>
                  {/* Participants */}
                  <div className="flex items-center gap-2 mt-2">
                    {pInfo && pInfo.count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          {pInfo.photos.slice(0, 5).map((photo, i) => (
                            photo ? (
                              <img key={i} src={photo} alt="" className="w-6 h-6 rounded-full border-2 border-[var(--surface)] object-cover" />
                            ) : (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--surface)] bg-[var(--surface-high)] flex items-center justify-center">
                                <span className="text-[8px] font-bold text-[var(--outline)]">{pInfo.names[i]?.[0]?.toUpperCase() || "?"}</span>
                              </div>
                            )
                          ))}
                        </div>
                        <span className="text-[10px] text-[var(--outline)]">{pInfo.count} participant{pInfo.count > 1 ? "s" : ""}</span>
                      </div>
                    )}
                    {s.wings.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--outline)]">Wings:</span>
                        {s.wings.slice(0, 3).map((w) => <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-high)] text-[var(--on-surface-variant)]">{w}</span>)}
                        {s.wings.length > 3 && <span className="text-[10px] text-[var(--outline)]">+{s.wings.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Tooltip text="Mois précédent" position="bottom">
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
            </Tooltip>
            <h2 className="text-sm font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] capitalize">{monthLabel}</h2>
            <Tooltip text="Mois suivant" position="bottom">
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </Tooltip>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => <div key={d} className="text-center text-[10px] text-[var(--outline)] font-medium py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const daySessions = sessionsByDay[day] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth.getMonth() && new Date().getFullYear() === calMonth.getFullYear();
              return (
                <div key={day} className={`min-h-[60px] rounded-lg p-1 transition-all ${isToday ? "bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/20" : "hover:bg-[var(--surface-high)]"}`}>
                  <p className={`text-[10px] font-medium mb-0.5 ${isToday ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"}`}>{day}</p>
                  {daySessions.map((s) => (
                    <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                      <div className={`text-[9px] px-1 py-0.5 rounded truncate mb-0.5 transition-colors ${
                        s.isPublic ? "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20" : "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      }`}>
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
