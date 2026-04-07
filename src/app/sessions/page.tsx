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
    <div className="flex items-center gap-1.5">
      {[
        { v: h, l: "h" },
        { v: m, l: "m" },
        { v: s, l: "s" },
      ].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <span className="text-sm font-bold font-mono text-cyan-400 tabular-nums leading-none">{String(v).padStart(2, "0")}</span>
          <span className="text-[8px] text-cyan-400/60 uppercase">{l}</span>
        </div>
      ))}
    </div>
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
    <div className="flex items-center gap-1.5">
      {[
        ...(h > 0 ? [{ v: h, l: "h" }] : []),
        { v: m, l: "m" },
        { v: s, l: "s" },
      ].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums leading-none">{String(v).padStart(2, "0")}</span>
          <span className="text-[8px] text-emerald-400/60 uppercase">{l}</span>
        </div>
      ))}
    </div>
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

  useEffect(() => {
    fetchPublicSessionsAction().then((ps) => {
      setPublicSessions(ps);
      setPublicLoaded(true);
    }).catch(() => setPublicLoaded(true));
  }, []);

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

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    const limit = now + 48 * 3600 * 1000;
    return categorizedSessions
      .filter((s) => { const t = new Date(s.date).getTime(); return t > now && t <= limit; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [categorizedSessions]);

  const activeSessions = useMemo(() => categorizedSessions.filter((s) => s.isActive), [categorizedSessions]);

  const todaySessions = useMemo(() => {
    const today = new Date();
    return categorizedSessions.filter((s) => {
      const d = new Date(s.date);
      return d.toDateString() === today.toDateString() && d.getTime() > Date.now();
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [categorizedSessions]);

  const filtered = useMemo(() => {
    let list = categorizedSessions;
    if (filter !== "all") list = list.filter((s) => s.category === filter);
    if (sort === "date_desc") list = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sort === "date_asc") list = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sort === "proximity") list = [...list].sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    return list;
  }, [categorizedSessions, filter, sort]);

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
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Sessions</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Organise et rejoins des sessions de game</p>
        </div>
        <Link href={sessionAtLimit ? "#" : "/sessions/new"} onClick={sessionAtLimit ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
          <Button disabled={sessionAtLimit} className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle session
          </Button>
        </Link>
      </div>

      {/* Limit banner */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={monthlySessionCount} limit={FREE_LIMITS.sessionsPerMonth} itemName="sessions" />
        </div>
      )}

      {/* ─── Stats Hero ─── */}
      {allSessions.length > 0 && (
        <div className="relative rounded-[22px] overflow-hidden glass-card border border-[var(--glass-border)] mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--tertiary)]/[0.04] to-[var(--primary)]/[0.04]" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total", value: stats.total, color: "text-[var(--on-surface)]", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
              { label: "Ce mois", value: stats.thisMonth, color: "text-[var(--primary)]", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Close rate", value: `${stats.avgCloseRate}%`, color: "text-emerald-400", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
              { label: "Interactions", value: stats.totalInteractionsInSessions, color: "text-[var(--tertiary)]", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
            ].map((stat, i) => (
              <div key={stat.label} className={`flex flex-col items-center py-5 gap-1.5 ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r lg:border-r" : i === 1 ? "lg:border-r" : ""} border-[var(--glass-border)]`}>
                <div className="w-9 h-9 rounded-[12px] bg-[var(--surface-high)] flex items-center justify-center mb-1">
                  <svg className={`w-4.5 h-4.5 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <span className={`text-2xl font-bold font-[family-name:var(--font-grotesk)] ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] text-[var(--outline)] tracking-wide uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Active Sessions — Live ─── */}
      {activeSessions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">En cours</span>
          </div>
          {activeSessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}>
              <div className="relative rounded-[18px] overflow-hidden border border-emerald-400/30 bg-gradient-to-r from-emerald-400/[0.06] to-emerald-400/[0.02] p-5 hover:border-emerald-400/50 transition-all group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-400/60 via-emerald-400 to-emerald-400/60" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-400/20 transition-colors">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-0.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {s.location}
                        <span className="text-[var(--outline)]">·</span>
                        <span className="text-emerald-400 font-medium">{s.interactionIds.length} interaction{s.interactionIds.length !== 1 ? "s" : ""}</span>
                      </p>
                    </div>
                  </div>
                  <ActiveTimer date={s.date} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ─── Today's Sessions — Countdown ─── */}
      {todaySessions.length > 0 && activeSessions.length === 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Aujourd&apos;hui</span>
          </div>
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="rounded-[16px] border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.04] to-transparent p-4 hover:border-cyan-400/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                        <p className="text-xs text-[var(--outline)]">{s.location} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <SameDayCountdown date={s.date} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── Upcoming (next 48h) ─── */}
      {upcomingSessions.filter((s) => !todaySessions.some((ts) => ts.id === s.id)).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--neon-purple)]" />
            <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">À venir</span>
          </div>
          <div className="space-y-2">
            {upcomingSessions.filter((s) => !todaySessions.some((ts) => ts.id === s.id)).slice(0, 3).map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="rounded-[16px] glass-card border border-[var(--glass-border)] p-4 hover:border-[var(--primary)]/30 hover:shadow-[0_0_16px_-6px_var(--neon-purple)] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                        <p className="text-xs text-[var(--outline)]">{formatDate(s.date)} {s.location && `· ${s.location}`}</p>
                      </div>
                    </div>
                    <CountdownBadge date={s.date} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── View Switcher + Filters ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 p-1 rounded-[14px] bg-[var(--surface-high)] border border-[var(--border)]">
          {([
            { key: "list" as ViewMode, label: "Liste", icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" },
            { key: "calendar" as ViewMode, label: "Calendrier", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" },
            { key: "map" as ViewMode, label: "Carte", icon: "M9 6.75V15m0 0l3-3m-3 3l-3-3M15 6.75V15m0-8.25l3 3m-3-3l-3 3m-3.375 6.75h10.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H5.625A2.25 2.25 0 003.375 6v8.25a2.25 2.25 0 002.25 2.25z" },
          ]).map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium transition-all ${
                view === v.key
                  ? "bg-[var(--glass-bg)] backdrop-blur-sm text-[var(--on-surface)] shadow-sm border border-[var(--glass-border)]"
                  : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={v.icon} />
              </svg>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {view === "list" && allSessions.length > 0 && (
          <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
            {(["all", "private", "public_mine", "public_joined"] as SessionFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap font-medium ${
                  filter === f
                    ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/25"
                    : "bg-transparent text-[var(--outline)] border-transparent hover:text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)]"
                }`}>
                {f === "all" ? "Toutes" : f === "private" ? "Privées" : f === "public_mine" ? "Publiques" : "Rejointes"}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {(["date_desc", "date_asc", "proximity"] as SortMode[]).map((s) => (
                <button key={s} onClick={() => setSort(s)}
                  className={`text-[10px] px-2 py-1 rounded-lg transition-all ${sort === s ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
                  {s === "date_desc" ? "Récent" : s === "date_asc" ? "Ancien" : "Proximité"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Empty State ─── */}
      {allSessions.length === 0 && nearbySessions.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={28} />}
          title="Aucune session"
          description="Une session regroupe plusieurs interactions lors d'une sortie."
          action={<Link href="/sessions/new"><Button>Créer une session</Button></Link>}
        />
      ) : view === "map" ? (
        /* ─── Map View ─── */
        <div className="rounded-[18px] overflow-hidden glass-card border border-[var(--glass-border)] mb-4">
          <div className="h-[420px]">
            <MapView
              markers={mapMarkers}
              center={userProfile?.lat && userProfile?.lng ? [userProfile.lat, userProfile.lng] : undefined}
              zoom={userProfile?.lat ? 10 : 5}
            />
          </div>
          <div className="p-4 border-t border-[var(--glass-border)] flex items-center justify-between">
            <p className="text-xs text-[var(--on-surface-variant)]">
              {mapMarkers.length} session{mapMarkers.length !== 1 ? "s" : ""} sur la carte
            </p>
            {nearbySessions.length > 0 && (
              <Badge className="bg-emerald-400/15 text-emerald-400">{nearbySessions.length} publique{nearbySessions.length > 1 ? "s" : ""} à proximité</Badge>
            )}
          </div>
        </div>
      ) : view === "list" ? (
        /* ─── List View ─── */
        <div className="space-y-3">
          {filtered.map((s) => {
            const sessionInteractions = interactions.filter((i) => s.interactionIds.includes(i.id));
            const closes = sessionInteractions.filter((i) => i.result === "close").length;
            const pInfo = participantCounts[s.id];
            const isFuture = new Date(s.date).getTime() > Date.now();
            return (
              <div key={s.id} className="rounded-[16px] glass-card border border-[var(--glass-border)] overflow-hidden hover:border-[var(--primary)]/20 hover:shadow-[0_2px_20px_-6px_var(--neon-purple)] transition-all">
                <Link href={`/sessions/${s.id}`} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Status icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        s.isActive ? "bg-emerald-400/15" : s.isPast ? "bg-[var(--surface-high)]" : "bg-[var(--primary)]/10"
                      }`}>
                        <svg className={`w-5 h-5 ${s.isActive ? "text-emerald-400" : s.isPast ? "text-[var(--outline)]" : "text-[var(--primary)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={
                            s.isActive ? "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                            : s.isPast ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                          } />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session sans titre"}</h3>
                          <Badge className={categoryColor(s.category)}>{categoryLabel(s.category)}</Badge>
                          {s.isActive && <Badge className="bg-emerald-400/15 text-emerald-400">En cours</Badge>}
                          {isFuture && !s.isActive && <Badge className="bg-cyan-400/15 text-cyan-400">Planifiée</Badge>}
                        </div>
                        <p className="text-xs text-[var(--outline)] flex items-center gap-1 flex-wrap">
                          <span>{formatDate(s.date)}</span>
                          {s.location && <><span className="text-[var(--border)]">·</span><span>{s.location}</span></>}
                          {s.distanceKm !== null && <><span className="text-[var(--border)]">·</span><span className="text-[var(--primary)]">{s.distanceKm} km</span></>}
                          {s.estimatedDuration && (
                            <><span className="text-[var(--border)]">·</span><span>{Math.floor(s.estimatedDuration / 60) > 0 ? `${Math.floor(s.estimatedDuration / 60)}h` : ""}{s.estimatedDuration % 60 > 0 ? `${String(s.estimatedDuration % 60).padStart(2, "0")}min` : ""}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {s.isActive && <ActiveTimer date={s.date} />}
                      {!isFuture && !s.isActive && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-[var(--on-surface-variant)] px-2 py-0.5 rounded-md bg-[var(--surface-high)]">{s.interactionIds.length} inter.</span>
                          {closes > 0 && <span className="text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-400/10">{closes} close{closes > 1 ? "s" : ""}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Participants & Wings */}
                  {(pInfo?.count || s.wings.length > 0) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                      {pInfo && pInfo.count > 0 && (
                        <div className="flex items-center gap-2">
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
                            {s.maxParticipants > 0 && ` · ${Math.max(0, s.maxParticipants - pInfo.count)} place${Math.max(0, s.maxParticipants - pInfo.count) > 1 ? "s" : ""}`}
                          </span>
                        </div>
                      )}
                      {s.wings.length > 0 && (
                        <div className="flex items-center gap-1">
                          {s.wings.slice(0, 3).map((w) => <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)] font-medium">{w}</span>)}
                          {s.wings.length > 3 && <span className="text-[10px] text-[var(--outline)]">+{s.wings.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </Link>

                {/* Delete action */}
                {ownIds.has(s.id) && (
                  <div className="flex justify-end px-4 pb-3">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(s.id); }}
                      className="text-[10px] text-[var(--outline)] hover:text-[var(--error)] transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--error)]/5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Calendar View ─── */
        <div className="rounded-[18px] glass-card border border-[var(--glass-border)] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <h2 className="text-sm font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] capitalize">{monthLabel}</h2>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((d) => <div key={d} className="text-center text-[10px] text-[var(--outline)] font-semibold py-2 uppercase tracking-wider">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                const daySessions = sessionsByDay[day] || [];
                const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth.getMonth() && new Date().getFullYear() === calMonth.getFullYear();
                const hasSessions = daySessions.length > 0;
                return (
                  <div key={day} className={`min-h-[68px] rounded-xl p-1.5 transition-all ${
                    isToday
                      ? "bg-[var(--primary)]/8 ring-1 ring-[var(--primary)]/25"
                      : hasSessions
                        ? "bg-[var(--surface-high)]/50 hover:bg-[var(--surface-high)]"
                        : "hover:bg-[var(--surface-high)]/30"
                  }`}>
                    <p className={`text-[11px] font-medium mb-1 ${
                      isToday ? "text-[var(--primary)] font-bold" : hasSessions ? "text-[var(--on-surface)]" : "text-[var(--outline)]"
                    }`}>{day}</p>
                    {daySessions.map((s) => (
                      <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                        <div className={`text-[9px] px-1.5 py-1 rounded-lg truncate mb-0.5 transition-colors font-medium ${
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
          </div>
        </div>
      )}

      {/* ─── Nearby Public Sessions ─── */}
      {nearbySessions.length > 0 && view === "list" && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--primary)]/20 to-emerald-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Sessions près de toi</h2>
              <p className="text-[10px] text-[var(--outline)]">Sessions publiques à venir que tu peux rejoindre</p>
            </div>
          </div>
          <div className="space-y-3">
            {nearbySessions.slice(0, 5).map((s) => (
              <div key={s.id} className="rounded-[16px] glass-card border border-[var(--glass-border)] p-4 hover:border-emerald-400/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session"}</h3>
                      <p className="text-xs text-[var(--outline)]">
                        {formatDate(s.date)} {s.location && `· ${s.location}`}
                        {s.distanceKm !== null && <span className="text-emerald-400 font-medium"> · {s.distanceKm} km</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <CountdownBadge date={s.date} />
                    {(() => {
                      const pCount = participantCounts[s.id]?.count ?? 0;
                      if (s.maxParticipants > 0) {
                        const remaining = Math.max(0, s.maxParticipants - pCount);
                        return remaining > 0
                          ? <span className="text-[10px] text-emerald-400">{remaining} place{remaining > 1 ? "s" : ""}</span>
                          : <Badge className="bg-[#fb7185]/15 text-[#fb7185]">Complet</Badge>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/sessions/${s.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      Plus d&apos;infos
                    </Button>
                  </Link>
                  {(() => {
                    const pCount = participantCounts[s.id]?.count ?? 0;
                    const isFull = s.maxParticipants > 0 && pCount >= s.maxParticipants;
                    return (
                      <Button size="sm" disabled={isFull} onClick={async (e: React.MouseEvent) => { e.stopPropagation(); await joinPublicSessionAction(s.id); window.location.reload(); }}>
                        {isFull ? "Complet" : "Rejoindre"}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ─── */}
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
