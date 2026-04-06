"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { fetchSessionParticipantsWithProfilesAction, fetchPublicSessionsAction, joinPublicSessionAction } from "@/actions/db";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconCalendar } from "@/components/ui/Icons";
import { MapView } from "@/components/ui/MapView";
import { useSubscription } from "@/hooks/useSubscription";
import { LimitReachedBanner } from "@/components/ui/PremiumGate";
import { FREE_LIMITS, countThisMonth } from "@/lib/premium";
import { Modal } from "@/components/ui/Modal";
import type { MapMarker } from "@/components/ui/MapView";
import type { Session } from "@/types";
import Link from "next/link";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type SessionFilter = "all" | "private" | "public_mine" | "public_joined";
type SortMode = "date_desc" | "date_asc" | "proximity";
type ViewMode = "list" | "calendar" | "map";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useCountdown(targetDate: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 48) return null;
  if (hours >= 24) return `demain`;
  if (hours > 0) return `dans ${hours}h${mins > 0 ? `${String(mins).padStart(2, "0")}` : ""}`;
  return `dans ${mins} min`;
}

function CountdownBadge({ date }: { date: string }) {
  const label = useCountdown(date);
  if (!label) return null;
  return <Badge className="bg-cyan-400/15 text-cyan-400 animate-pulse">{label}</Badge>;
}

function SameDayCountdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const target = new Date(date).getTime();
  const diff = target - now;
  if (diff <= 0 || diff > 24 * 3600 * 1000) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <span className="text-xs font-mono text-cyan-400 tabular-nums">
      {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function ActiveTimer({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const start = new Date(date).getTime();
  const diff = now - start;
  if (diff < 0 || diff > 4 * 3600 * 1000) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <span className="text-xs font-mono text-emerald-400 tabular-nums">
      {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export default function SessionsPage() {
  const { sessions, invitedSessions, allSessions, loaded, remove } = useSessions();
  const { interactions } = useInteractions();
  const { profile: userProfile } = usePublicProfile();
  const { isPremium } = useSubscription();
  const monthlySessionCount = useMemo(() => countThisMonth(sessions), [sessions]);
  const sessionAtLimit = !isPremium && monthlySessionCount >= FREE_LIMITS.sessionsPerMonth;
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [sort, setSort] = useState<SortMode>("date_desc");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [participantCounts, setParticipantCounts] = useState<Record<string, { count: number; names: string[]; photos: (string | null)[] }>>({});
  const [publicSessions, setPublicSessions] = useState<Session[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invitedIds = useMemo(() => new Set(invitedSessions.map((s) => s.id)), [invitedSessions]);
  const ownIds = useMemo(() => new Set(sessions.map((s) => s.id)), [sessions]);

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

  // Fetch public sessions for discovery
  useEffect(() => {
    fetchPublicSessionsAction().then((ps) => {
      setPublicSessions(ps);
      setPublicLoaded(true);
    }).catch(() => setPublicLoaded(true));
  }, []);

  // Nearby public sessions (not mine, not joined, future, within 50km)
  const nearbySessions = useMemo(() => {
    const myIds = new Set([...Array.from(ownIds), ...Array.from(invitedIds)]);
    const userLat = userProfile?.lat;
    const userLng = userProfile?.lng;
    return publicSessions
      .filter((s) => !myIds.has(s.id) && new Date(s.date).getTime() > Date.now())
      .map((s) => {
        const distanceKm = (userLat && userLng && s.lat && s.lng) ? Math.round(haversineKm(userLat, userLng, s.lat, s.lng)) : null;
        return { ...s, distanceKm };
      })
      .filter((s) => s.distanceKm !== null && s.distanceKm <= 50)
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [publicSessions, ownIds, invitedIds, userProfile]);

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    return allSessions.map((s) => {
      const isJoined = invitedIds.has(s.id);
      const category: SessionFilter = !s.isPublic ? "private" : isJoined ? "public_joined" : "public_mine";
      const userLat = userProfile?.lat;
      const userLng = userProfile?.lng;
      const distanceKm = (userLat && userLng && s.lat && s.lng) ? Math.round(haversineKm(userLat, userLng, s.lat, s.lng)) : null;
      const sTime = new Date(s.date).getTime();
      const autoEnd = s.estimatedDuration
        ? sTime + (s.estimatedDuration + 60) * 60 * 1000
        : sTime + 4 * 3600 * 1000;
      const isPast = !!s.endedAt || (sTime <= Date.now() && Date.now() > autoEnd);
      const isActive = !isPast && sTime <= Date.now();
      return { ...s, category, distanceKm, isPast, isActive };
    });
  }, [allSessions, invitedIds, userProfile]);

  // Upcoming sessions (next 48h, not past)
  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    const limit = now + 48 * 3600 * 1000;
    return categorizedSessions
      .filter((s) => {
        const t = new Date(s.date).getTime();
        return t > now && t <= limit;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [categorizedSessions]);

  // Active sessions (started, not past 4h)
  const activeSessions = useMemo(() => categorizedSessions.filter((s) => s.isActive), [categorizedSessions]);

  // Same-day sessions (today, future)
  const todaySessions = useMemo(() => {
    const today = new Date();
    return categorizedSessions.filter((s) => {
      const d = new Date(s.date);
      return d.toDateString() === today.toDateString() && d.getTime() > Date.now();
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [categorizedSessions]);

  // Filter
  const filtered = useMemo(() => {
    let list = categorizedSessions;
    if (filter !== "all") list = list.filter((s) => s.category === filter);
    if (sort === "date_desc") list = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sort === "date_asc") list = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sort === "proximity") list = [...list].sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    return list;
  }, [categorizedSessions, filter, sort]);

  // Stats
  const stats = useMemo(() => {
    const total = allSessions.length;
    const thisMonth = allSessions.filter((s) => {
      const d = new Date(s.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const allInteractionIds = allSessions.flatMap((s) => s.interactionIds);
    const sessionInteractions = interactions.filter((i) => allInteractionIds.includes(i.id));
    const sessionCloses = sessionInteractions.filter((i) => i.result === "close").length;
    const avgCloseRate = sessionInteractions.length > 0 ? Math.round((sessionCloses / sessionInteractions.length) * 100) : 0;
    const totalInteractionsInSessions = sessionInteractions.length;
    return { total, thisMonth, avgCloseRate, totalInteractionsInSessions };
  }, [allSessions, interactions]);

  // Calendar
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

  // Map markers
  const mapMarkers: MapMarker[] = useMemo(() => {
    const allWithCoords = [...categorizedSessions, ...nearbySessions].filter((s) => s.lat && s.lng);
    const seen = new Set<string>();
    return allWithCoords.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }).map((s) => ({
      lat: s.lat!,
      lng: s.lng!,
      label: s.title || "Session",
      sublabel: `${formatDate(s.date)} ${s.location ? `· ${s.location}` : ""}`,
      isWing: !ownIds.has(s.id),
    }));
  }, [categorizedSessions, nearbySessions, ownIds]);

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
      <div className="mb-4">
        <div className="mb-3">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Sessions</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Organise et rejoins des sessions de game — {allSessions.length} session{allSessions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-xl flex-1 min-w-0">
            {(["list", "calendar", "map"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${view === v ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
                {v === "list" ? "Liste" : v === "calendar" ? "Calendrier" : "Carte"}
              </button>
            ))}
          </div>
          <Link href={sessionAtLimit ? "#" : "/sessions/new"} className="shrink-0" onClick={sessionAtLimit ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
            <Button className="whitespace-nowrap" disabled={sessionAtLimit}>+ Session{!isPremium ? ` (${monthlySessionCount}/${FREE_LIMITS.sessionsPerMonth})` : ""}</Button>
          </Link>
        </div>
      </div>

      {/* Limit banner for free users */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={monthlySessionCount} limit={FREE_LIMITS.sessionsPerMonth} itemName="sessions" />
        </div>
      )}

      {/* Stats summary */}
      {allSessions.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Card className="text-center !p-3">
            <p className="text-lg font-bold text-[var(--on-surface)] font-[family-name:var(--font-grotesk)]">{stats.total}</p>
            <p className="text-[9px] text-[var(--outline)]">Total</p>
          </Card>
          <Card className="text-center !p-3">
            <p className="text-lg font-bold text-[var(--primary)] font-[family-name:var(--font-grotesk)]">{stats.thisMonth}</p>
            <p className="text-[9px] text-[var(--outline)]">Ce mois</p>
          </Card>
          <Card className="text-center !p-3">
            <p className="text-lg font-bold text-emerald-400 font-[family-name:var(--font-grotesk)]">{stats.avgCloseRate}%</p>
            <p className="text-[9px] text-[var(--outline)]">Close rate</p>
          </Card>
          <Card className="text-center !p-3">
            <p className="text-lg font-bold text-[var(--tertiary)] font-[family-name:var(--font-grotesk)]">{stats.totalInteractionsInSessions}</p>
            <p className="text-[9px] text-[var(--outline)]">Interactions</p>
          </Card>
        </div>
      )}

      {/* Active sessions — live timer */}
      {activeSessions.length > 0 && (
        <div className="mb-4">
          {activeSessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}>
              <Card className="!p-4 border-emerald-400/30 bg-emerald-400/5 relative overflow-hidden">
                <div className="absolute top-2 right-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-1">Session en cours</p>
                    <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                    <p className="text-xs text-[var(--outline)] mt-0.5">{s.location}</p>
                  </div>
                  <div className="text-right">
                    <ActiveTimer date={s.date} />
                    <p className="text-[10px] text-[var(--outline)] mt-1">{s.interactionIds.length} inter.</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Today's sessions countdown */}
      {todaySessions.length > 0 && activeSessions.length === 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider font-semibold">Aujourd'hui</p>
          {todaySessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}>
              <Card className="!p-4 border-cyan-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                    <p className="text-xs text-[var(--outline)]">{s.location} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <SameDayCountdown date={s.date} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming sessions hero (next 48h, not same-day since those are above) */}
      {upcomingSessions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider font-semibold mb-2">A venir</p>
          <div className="space-y-2">
            {upcomingSessions.filter((s) => !todaySessions.some((ts) => ts.id === s.id)).slice(0, 3).map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <Card hover className="!p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                        <p className="text-xs text-[var(--outline)]">{formatDate(s.date)} {s.location && `· ${s.location}`}</p>
                      </div>
                    </div>
                    <CountdownBadge date={s.date} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Sort — list view only */}
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

      {allSessions.length === 0 && nearbySessions.length === 0 ? (
        <EmptyState icon={<IconCalendar size={28} />} title="Aucune session" description="Une session regroupe plusieurs interactions lors d'une sortie." action={<Link href="/sessions/new"><Button>Créer une session</Button></Link>} />
      ) : view === "map" ? (
        /* Map view */
        <Card className="!p-0 overflow-hidden mb-4">
          <div className="h-[400px]">
            <MapView
              markers={mapMarkers}
              center={userProfile?.lat && userProfile?.lng ? [userProfile.lat, userProfile.lng] : undefined}
              zoom={userProfile?.lat ? 10 : 5}
            />
          </div>
          <div className="p-3 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--on-surface-variant)]">
              {mapMarkers.length} session{mapMarkers.length !== 1 ? "s" : ""} sur la carte
              {nearbySessions.length > 0 && ` · ${nearbySessions.length} publique${nearbySessions.length > 1 ? "s" : ""} a proximite`}
            </p>
          </div>
        </Card>
      ) : view === "list" ? (
        <div className="space-y-3">
          {filtered.map((s) => {
            const sessionInteractions = interactions.filter((i) => s.interactionIds.includes(i.id));
            const closes = sessionInteractions.filter((i) => i.result === "close").length;
            const pInfo = participantCounts[s.id];
            const isFuture = new Date(s.date).getTime() > Date.now();
            return (
              <Card key={s.id} hover className="!p-4">
                <Link href={`/sessions/${s.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session sans titre"}</h3>
                        <Badge className={categoryColor(s.category)}>{categoryLabel(s.category)}</Badge>
                        {s.isActive && <Badge className="bg-emerald-400/15 text-emerald-400">En cours</Badge>}
                        {isFuture && !s.isActive && <Badge className="bg-cyan-400/15 text-cyan-400">Planifiée</Badge>}
                        {s.isPast && <Badge className="bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]">Terminée</Badge>}
                      </div>
                      <p className="text-xs text-[var(--outline)]">
                        {formatDate(s.date)} {s.location && `· ${s.location}`}
                        {s.distanceKm !== null && ` · ${s.distanceKm} km`}
                        {s.estimatedDuration && ` · ${Math.floor(s.estimatedDuration / 60) > 0 ? `${Math.floor(s.estimatedDuration / 60)}h` : ""}${s.estimatedDuration % 60 > 0 ? `${String(s.estimatedDuration % 60).padStart(2, "0")}min` : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.isActive && <ActiveTimer date={s.date} />}
                      {!isFuture && !s.isActive && (
                        <>
                          <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">{s.interactionIds.length} inter.</Badge>
                          {closes > 0 && <Badge className="bg-emerald-400/15 text-emerald-400">{closes} close{closes > 1 ? "s" : ""}</Badge>}
                        </>
                      )}
                    </div>
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
                        <span className="text-[10px] text-[var(--outline)]">
                          {pInfo.count} participant{pInfo.count > 1 ? "s" : ""}
                          {s.maxParticipants > 0 && ` · ${Math.max(0, s.maxParticipants - pInfo.count)} place${Math.max(0, s.maxParticipants - pInfo.count) > 1 ? "s" : ""} restante${Math.max(0, s.maxParticipants - pInfo.count) > 1 ? "s" : ""}`}
                        </span>
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
                </Link>
                {/* Delete button — only for own sessions */}
                {ownIds.has(s.id) && (
                  <div className="flex justify-end mt-2 pt-2 border-t border-[var(--border)]">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(s.id); }}
                      className="text-[10px] text-[var(--outline)] hover:text-[var(--error)] transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Supprimer
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* Calendar view */
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

      {/* Nearby public sessions — discovery */}
      {nearbySessions.length > 0 && view === "list" && (
        <div className="mt-6">
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            Sessions pres de toi
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)] mb-3">Sessions publiques a venir que tu peux rejoindre</p>
          <div className="space-y-2">
            {nearbySessions.slice(0, 5).map((s) => (
              <Card key={s.id} hover className="!p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                    <p className="text-xs text-[var(--outline)]">
                      {formatDate(s.date)} {s.location && `· ${s.location}`}
                      {s.distanceKm !== null && <span className="text-[var(--primary)]"> · {s.distanceKm} km</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CountdownBadge date={s.date} />
                    {(() => {
                      const pCount = participantCounts[s.id]?.count ?? 0;
                      if (s.maxParticipants > 0) {
                        const remaining = Math.max(0, s.maxParticipants - pCount);
                        return remaining > 0
                          ? <span className="text-[10px] text-emerald-400">{remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}</span>
                          : <Badge className="bg-[#fb7185]/15 text-[#fb7185]">Complet</Badge>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Link href={`/sessions/${s.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                        Plus d&apos;infos
                      </span>
                    </Button>
                  </Link>
                  {(() => {
                    const pCount = participantCounts[s.id]?.count ?? 0;
                    const isFull = s.maxParticipants > 0 && pCount >= s.maxParticipants;
                    return (
                      <Button size="sm" disabled={isFull} onClick={async (e: React.MouseEvent) => { e.stopPropagation(); await joinPublicSessionAction(s.id); window.location.reload(); }}>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          {isFull ? "Complet" : "Rejoindre"}
                        </span>
                      </Button>
                    );
                  })()}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer la session">
        <p className="text-sm text-[var(--on-surface-variant)] mb-4">Es-tu sûr de vouloir supprimer cette session ? Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button
            className="flex-1 !bg-[var(--error)] hover:!opacity-90"
            disabled={deleting}
            onClick={async () => {
              if (!deleteTarget) return;
              setDeleting(true);
              await remove(deleteTarget);
              setDeleting(false);
              setDeleteTarget(null);
            }}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
