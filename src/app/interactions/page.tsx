"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import { InteractionCard } from "@/components/interactions/InteractionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { IconMessageCircle } from "@/components/ui/Icons";
import Link from "next/link";
import type { Interaction, ApproachType, ResultType, DurationType } from "@/types";
import { APPROACH_LABELS, RESULT_LABELS, DURATION_LABELS, RESULT_COLORS, TYPE_COLORS } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";
import { LimitReachedBanner } from "@/components/ui/PremiumGate";
import { FREE_LIMITS, countThisMonth } from "@/lib/premium";

// ─── Calendar helpers ─────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday start
}
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_NAMES = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

type SortKey = "date" | "feeling" | "woman" | "result";
type ViewMode = "list" | "calendar";

const PAGE_SIZE = 30;

// ─── Skeleton ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="!p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-24 bg-[var(--surface-bright)] rounded" />
            <div className="h-4 w-14 bg-[var(--surface-bright)] rounded-full" />
          </div>
          <div className="h-3 w-48 bg-[var(--surface-bright)] rounded mt-2" />
          <div className="flex gap-3 mt-2">
            <div className="h-2.5 w-16 bg-[var(--surface-bright)] rounded" />
            <div className="h-2.5 w-12 bg-[var(--surface-bright)] rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-5 w-14 bg-[var(--surface-bright)] rounded-full" />
          <div className="flex gap-1.5">
            <div className="w-8 h-8 bg-[var(--surface-bright)] rounded-lg" />
            <div className="w-8 h-8 bg-[var(--surface-bright)] rounded-lg" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function InteractionsPage() {
  const { interactions, loaded, remove } = useInteractions();
  const gamState = useGamification();
  const { isPremium } = useSubscription();
  const monthlyCount = useMemo(() => countThisMonth(interactions), [interactions]);
  const atLimit = !isPremium && monthlyCount >= FREE_LIMITS.interactionsPerMonth;

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ApproachType | "">("");
  const [filterResult, setFilterResult] = useState<ResultType | "">("");
  const [filterDuration, setFilterDuration] = useState<DurationType | "">("");
  const [filterTag, setFilterTag] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Calendar day detail
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // All unique tags from interactions
  const allTags = useMemo(() => {
    const t = new Set<string>();
    interactions.forEach((i) => (i.tags ?? []).forEach((tag) => t.add(tag)));
    return [...t].sort();
  }, [interactions]);

  // ─── Filter + Sort logic ────────────────────────────
  const filtered = useMemo(() => {
    let result = [...interactions];
    const q = searchQuery.toLowerCase();
    if (q) {
      result = result.filter((i) =>
        (i.firstName || "").toLowerCase().includes(q) ||
        (i.memorableElement || "").toLowerCase().includes(q) ||
        (i.location || "").toLowerCase().includes(q) ||
        (i.note || "").toLowerCase().includes(q) ||
        (i.tags ?? []).some((t) => t.includes(q))
      );
    }
    if (filterType) result = result.filter((i) => i.type === filterType);
    if (filterResult) result = result.filter((i) => i.result === filterResult);
    if (filterDuration) result = result.filter((i) => i.duration === filterDuration);
    if (filterTag) result = result.filter((i) => (i.tags ?? []).includes(filterTag));
    if (dateFrom) result = result.filter((i) => i.date >= dateFrom);
    if (dateTo) result = result.filter((i) => i.date <= dateTo + "T23:59:59");
    return result;
  }, [interactions, searchQuery, filterType, filterResult, filterDuration, filterTag, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date": cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case "feeling": cmp = a.feelingScore - b.feelingScore; break;
        case "woman": cmp = (a.womanScore ?? 0) - (b.womanScore ?? 0); break;
        case "result": {
          const order = { close: 3, neutral: 2, rejection: 1 };
          cmp = (order[a.result] || 0) - (order[b.result] || 0);
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const visibleItems = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);

  // ─── Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const total = interactions.length;
    const closes = interactions.filter((i) => i.result === "close").length;
    const avgFeeling = total > 0 ? (interactions.reduce((s, i) => s + i.feelingScore, 0) / total).toFixed(1) : "-";
    const avgWoman = total > 0 ? (interactions.reduce((s, i) => s + (i.womanScore ?? 0), 0) / total).toFixed(1) : "-";
    return { total, closes, closeRate: total > 0 ? ((closes / total) * 100).toFixed(0) : "0", avgFeeling, avgWoman };
  }, [interactions]);

  // ─── Infinite scroll ────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (visibleCount >= sorted.length) return;
      const scrollY = window.scrollY + window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      if (scrollY >= docH - 400) setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sorted.length, visibleCount]);

  // Reset pagination on filter change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, filterType, filterResult, filterDuration, filterTag, dateFrom, dateTo, sortKey, sortAsc]);

  // ─── Bulk actions ───────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    for (const id of selected) await remove(id);
    setSelected(new Set());
    setBulkMode(false);
    setShowBulkDelete(false);
  };

  // ─── CSV Export ─────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Date", "Prenom", "Element marquant", "Lieu", "Type", "Resultat", "Duree", "Ressenti", "Note fille", "Objection", "Tags", "Note", "Feedback", "Sujets discussion"];
    const rows = sorted.map((i) => [
      new Date(i.date).toLocaleDateString("fr-FR"),
      i.firstName,
      i.memorableElement,
      i.location,
      APPROACH_LABELS[i.type],
      RESULT_LABELS[i.result],
      DURATION_LABELS[i.duration],
      i.feelingScore,
      i.womanScore ?? "",
      i.objection || "",
      (i.tags ?? []).join(", "),
      (i.note || "").replace(/\n/g, " "),
      (i.feedback || "").replace(/\n/g, " "),
      (i.discussionTopics || "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Calendar data ──────────────────────────────────
  const calendarMap = useMemo(() => {
    const map: Record<string, Interaction[]> = {};
    interactions.forEach((i) => {
      const key = new Date(i.date).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return map;
  }, [interactions]);

  const activeFilterCount = [filterType, filterResult, filterDuration, filterTag, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("");
    setFilterResult("");
    setFilterDuration("");
    setFilterTag("");
    setDateFrom("");
    setDateTo("");
  };

  if (!loaded) return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="h-7 w-40 bg-[var(--surface-bright)] rounded mb-2 animate-pulse" />
        <div className="h-4 w-64 bg-[var(--surface-bright)] rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#c084fc] to-[#818cf8] bg-clip-text text-transparent">Interactions</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Historique de tes approches et rencontres — {interactions.length} interaction{interactions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={isPremium ? exportCSV : undefined} className={`p-2 rounded-lg transition-colors ${isPremium ? "hover:bg-[var(--surface-bright)] text-[var(--outline)]" : "text-[var(--outline)]/40 cursor-not-allowed"}`} title={isPremium ? "Exporter CSV" : "Export réservé à GameMax"}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          </button>
          <Link href={atLimit ? "#" : "/interactions/new"} onClick={atLimit ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
            <Button disabled={atLimit}>+ Ajouter{!isPremium ? ` (${monthlyCount}/${FREE_LIMITS.interactionsPerMonth})` : ""}</Button>
          </Link>
        </div>
      </div>

      {/* Limit banner for free users */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={monthlyCount} limit={FREE_LIMITS.interactionsPerMonth} itemName="interactions" />
        </div>
      )}

      {/* Streak banner */}
      {gamState.streak > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>
          <span className="text-xs font-medium text-[var(--primary)]">{gamState.streak} jour{gamState.streak > 1 ? "s" : ""} de streak</span>
          {gamState.bestStreak > gamState.streak && (
            <span className="text-[10px] text-[var(--outline)]">· Record : {gamState.bestStreak}j</span>
          )}
        </div>
      )}

      {/* Stats banner */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-[var(--on-surface)]" },
          { label: "Closes", value: stats.closes, color: "text-emerald-400" },
          { label: "Close %", value: `${stats.closeRate}%`, color: "text-[var(--tertiary)]" },
          { label: "Ressenti", value: stats.avgFeeling, color: "text-[var(--primary)]" },
          { label: "Note", value: stats.avgWoman, color: "text-[var(--secondary)]" },
        ].map((s) => (
          <Card key={s.label} className="text-center !p-2">
            <p className="text-[9px] text-[var(--outline)] uppercase tracking-wider">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* View toggle + bulk + search */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-[var(--surface-high)] rounded-lg p-0.5">
          {(["list", "calendar"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${viewMode === v ? "bg-[var(--primary)] text-white" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
            >
              {v === "list" ? "Liste" : "Calendrier"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${bulkMode ? "bg-red-500/10 text-red-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
        >
          {bulkMode ? "Annuler" : "Selectionner"}
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            placeholder="Rechercher par nom, lieu, note, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg pl-9 pr-3 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-3 h-9 text-xs rounded-lg transition-all ${showFilters || activeFilterCount > 0 ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          Filtres{activeFilterCount > 0 && <span className="ml-1 w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="!p-4 mb-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Type</p>
              <div className="flex flex-wrap gap-1">
                {(["", "direct", "indirect", "situational"] as (ApproachType | "")[]).map((v) => (
                  <button key={v} onClick={() => setFilterType(v)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterType === v ? (v ? TYPE_COLORS[v] : "bg-[var(--outline-variant)]/20 text-[var(--on-surface)]") : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    {v ? APPROACH_LABELS[v] : "Tous"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Resultat</p>
              <div className="flex flex-wrap gap-1">
                {(["", "close", "neutral", "rejection"] as (ResultType | "")[]).map((v) => (
                  <button key={v} onClick={() => setFilterResult(v)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterResult === v ? (v ? RESULT_COLORS[v] : "bg-[var(--outline-variant)]/20 text-[var(--on-surface)]") : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    {v ? RESULT_LABELS[v] : "Tous"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Duree</p>
              <div className="flex flex-wrap gap-1">
                {(["", "short", "medium", "long"] as (DurationType | "")[]).map((v) => (
                  <button key={v} onClick={() => setFilterDuration(v)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterDuration === v ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface)]" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    {v ? DURATION_LABELS[v] : "Toutes"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Tag</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterTag("")} className={`text-[10px] px-2 py-1 rounded-full transition-all ${!filterTag ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface)]" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>Tous</button>
                {allTags.map((t) => (
                  <button key={t} onClick={() => setFilterTag(t)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterTag === t ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>#{t}</button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Date debut</p>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-8 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-2 text-xs text-[var(--on-surface)] outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Date fin</p>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-8 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-2 text-xs text-[var(--on-surface)] outline-none" />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[10px] text-red-400 hover:underline">Reinitialiser les filtres</button>
          )}
        </Card>
      )}

      {/* Sort pills */}
      {viewMode === "list" && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] text-[var(--outline)] shrink-0 uppercase tracking-wider mr-1">Trier</span>
          {([
            { key: "date" as SortKey, label: "Date" },
            { key: "feeling" as SortKey, label: "Ressenti" },
            { key: "woman" as SortKey, label: "Note fille" },
            { key: "result" as SortKey, label: "Resultat" },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => { if (sortKey === s.key) setSortAsc(!sortAsc); else { setSortKey(s.key); setSortAsc(false); } }}
              className={`shrink-0 flex items-center gap-0.5 text-[10px] px-2.5 py-1 rounded-full transition-all ${sortKey === s.key ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}
            >
              {s.label}
              {sortKey === s.key && (
                <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
              )}
            </button>
          ))}
          <span className="text-[10px] text-[var(--outline)] ml-1">{filtered.length} resultat{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Bulk bar */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10 animate-fade-in">
          <span className="text-xs text-red-400 font-medium">{selected.size} selectionne{selected.size > 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <Button variant="danger" size="sm" onClick={() => setShowBulkDelete(true)}>Supprimer</Button>
        </div>
      )}

      {/* CONTENT */}
      {viewMode === "list" ? (
        sorted.length === 0 ? (
          <EmptyState
            icon={<IconMessageCircle size={28} />}
            title={activeFilterCount > 0 || searchQuery ? "Aucun resultat" : "Aucune interaction"}
            description={activeFilterCount > 0 || searchQuery ? "Essaie d'ajuster tes filtres." : "Commence par ajouter ta premiere interaction."}
            action={!searchQuery && !activeFilterCount ? <Link href="/interactions/new"><Button size="lg">Ajouter</Button></Link> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {visibleItems.map((i, idx) => (
              <div key={i.id} className="animate-slide-up flex items-center gap-2" style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
                {bulkMode && (
                  <button
                    onClick={() => toggleSelect(i.id)}
                    className={`w-5 h-5 shrink-0 rounded-md border-2 transition-all flex items-center justify-center ${selected.has(i.id) ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
                  >
                    {selected.has(i.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <InteractionCard interaction={i} />
                </div>
              </div>
            ))}
            {visibleCount < sorted.length && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
            )}
          </div>
        )
      ) : (
        /* CALENDAR VIEW */
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">{MONTH_NAMES[calMonth]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="p-1 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] text-[var(--outline)] font-medium py-1">{d}</div>
            ))}
            {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayInteractions = calendarMap[dateKey] || [];
              const count = dayInteractions.length;
              const hasClose = dayInteractions.some((x) => x.result === "close");
              const isToday = new Date().toISOString().slice(0, 10) === dateKey;

              return (
                <div
                  key={day}
                  onClick={() => count > 0 ? setSelectedCalDay(dateKey) : undefined}
                  className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all ${
                    isToday ? "ring-1 ring-[var(--primary)]/30" : ""
                  } ${count > 0 ? "bg-[var(--surface-high)] hover:bg-[var(--surface-bright)] cursor-pointer" : ""}`}
                  title={count > 0 ? `${count} interaction${count > 1 ? "s" : ""}${hasClose ? " (close!)": ""}` : undefined}
                >
                  <span className={`${count > 0 ? "text-[var(--on-surface)] font-medium" : "text-[var(--outline)]"}`}>{day}</span>
                  {count > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                        <div key={j} className={`w-1.5 h-1.5 rounded-full ${hasClose ? "bg-emerald-400" : "bg-[var(--primary)]"}`} />
                      ))}
                      {count > 4 && <span className="text-[8px] text-[var(--outline)]">+{count - 4}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar day detail modal */}
      <Modal open={!!selectedCalDay} onClose={() => setSelectedCalDay(null)} title={selectedCalDay ? new Date(selectedCalDay + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : ""}>
        {selectedCalDay && (calendarMap[selectedCalDay] || []).length > 0 ? (
          <div className="space-y-2">
            {(calendarMap[selectedCalDay] || []).map((i) => (
              <Link key={i.id} href={`/interactions/${i.id}`} onClick={() => setSelectedCalDay(null)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-high)] transition-all">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[var(--primary)]">{i.feelingScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[var(--on-surface)] font-medium">{i.firstName || i.memorableElement || "Anonyme"}</span>
                  <div className="flex gap-1 mt-0.5">
                    <Badge className={TYPE_COLORS[i.type]}>{APPROACH_LABELS[i.type]}</Badge>
                    <Badge className={RESULT_COLORS[i.result]}>{RESULT_LABELS[i.result]}</Badge>
                  </div>
                  {i.location && <p className="text-[10px] text-[var(--outline)] mt-0.5">{i.location}</p>}
                </div>
                {i.result === "close" && (
                  <Badge className="bg-emerald-400/15 text-emerald-400 shrink-0">Close</Badge>
                )}
                <svg className="w-4 h-4 text-[var(--outline)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--outline)] text-center py-4">Aucune interaction ce jour.</p>
        )}
      </Modal>

      {/* Bulk delete modal */}
      <Modal open={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Supprimer les interactions">
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Supprimer {selected.size} interaction{selected.size > 1 ? "s" : ""} ? Cette action est irreversible.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleBulkDelete}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setShowBulkDelete(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
