"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useContacts } from "@/hooks/useContacts";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import type { Contact, ContactStatus, ContactMethod } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useSubscription } from "@/hooks/useSubscription";
import { LimitReachedBanner } from "@/components/ui/PremiumGate";
import { FREE_LIMITS } from "@/lib/premium";
import { useToast } from "@/hooks/useToast";
import { IconUsers } from "@/components/ui/Icons";
import Link from "next/link";

const PIPELINE_ORDER: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"];
const ALL_STATUSES: ContactStatus[] = [...PIPELINE_ORDER, "archived"];

type ViewMode = "kanban" | "list";

// Status dot colors for funnel
const STATUS_DOT: Record<ContactStatus, string> = {
  new: "bg-[var(--primary)]",
  contacted: "bg-amber-400",
  replied: "bg-[var(--tertiary)]",
  date_planned: "bg-cyan-400",
  first_date: "bg-emerald-400",
  second_date: "bg-emerald-300",
  kissclose: "bg-[#f472b6]",
  fuckclose: "bg-rose-400",
  advanced: "bg-orange-400",
  archived: "bg-[var(--outline)]",
};

const STATUS_BORDER: Record<ContactStatus, string> = {
  new: "border-t-[var(--primary)]",
  contacted: "border-t-amber-400",
  replied: "border-t-[var(--tertiary)]",
  date_planned: "border-t-cyan-400",
  first_date: "border-t-emerald-400",
  second_date: "border-t-emerald-300",
  kissclose: "border-t-[#f472b6]",
  fuckclose: "border-t-rose-400",
  advanced: "border-t-orange-400",
  archived: "border-t-[var(--outline)]",
};

// ─── Helpers ──────────────────────────────────────────
function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function timeSinceLabel(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
}

// ─── Skeleton ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl bg-[var(--surface-high)] animate-pulse">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--surface-bright)]" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-[var(--surface-bright)] rounded mb-1" />
          <div className="h-2 w-14 bg-[var(--surface-bright)] rounded" />
        </div>
      </div>
      <div className="h-2 w-24 bg-[var(--surface-bright)] rounded" />
    </div>
  );
}

function SkeletonKanban() {
  return (
    <div className="space-y-6 md:flex md:gap-3 md:space-y-0 md:overflow-x-auto md:pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="md:min-w-[260px]">
          <div className="h-5 w-20 bg-[var(--surface-bright)] rounded-full mb-3 animate-pulse" />
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Funnel Bar ───────────────────────────────────────
function FunnelBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex rounded-lg overflow-hidden h-2.5 bg-[var(--surface-high)]">
        {PIPELINE_ORDER.map((s) => {
          const count = counts[s] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={s}
              className={`${STATUS_DOT[s]} transition-all duration-500 relative group`}
              style={{ width: `${pct}%`, minWidth: count > 0 ? "4px" : 0 }}
              title={`${STATUS_LABELS[s]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {PIPELINE_ORDER.map((s) => {
          const count = counts[s] || 0;
          if (count === 0) return null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              <span className="text-[10px] text-[var(--outline)]">{STATUS_LABELS[s]} <span className="font-semibold text-[var(--on-surface)]">{count}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────
function StatsRow({ contacts }: { contacts: Contact[] }) {
  const active = contacts.filter((c) => c.status !== "archived");
  const dates = active.filter((c) => ["date_planned", "first_date", "second_date"].includes(c.status));
  const closes = active.filter((c) => ["kissclose", "fuckclose", "advanced"].includes(c.status));
  const stale = active.filter((c) => daysSince(c.lastInteractionDate) >= 7);

  const stats = [
    { label: "Actifs", value: active.length, color: "text-[var(--primary)]" },
    { label: "En date", value: dates.length, color: "text-cyan-400" },
    { label: "Closes", value: closes.length, color: "text-rose-400" },
    { label: "Inactifs 7j+", value: stale.length, color: stale.length > 0 ? "text-amber-400" : "text-[var(--outline)]" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {stats.map((s) => (
        <div key={s.label} className="text-center p-2.5 rounded-xl bg-[var(--surface-high)] border border-[var(--border)]">
          <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          <div className="text-[9px] text-[var(--outline)] uppercase tracking-wider">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Contact card ─────────────────────────────────────
function ContactCard({
  contact,
  onQuickStatus,
  bulkMode,
  selected,
  onToggle,
  draggable,
  onDragStart,
  compact,
}: {
  contact: Contact;
  onQuickStatus: (id: string, status: ContactStatus) => void;
  bulkMode: boolean;
  selected: boolean;
  onToggle: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inactiveDays = daysSince(contact.lastInteractionDate);
  const stale = inactiveDays >= 5 && contact.status !== "archived";

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showMenu) { setShowMenu(false); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.top, left: rect.right - 140 });
    setShowMenu(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div
      className={`relative ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-center gap-2">
        {bulkMode && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            className={`w-5 h-5 shrink-0 rounded-md border-2 transition-all flex items-center justify-center ${selected ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
          >
            {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
          </button>
        )}
        <Link href={`/contacts/${contact.id}`} className="flex-1 min-w-0">
          <div className={`p-3 rounded-xl bg-[var(--surface-high)] border transition-all hover:bg-[var(--surface-bright)] hover:border-[var(--primary)]/20 ${stale ? "border-amber-500/20" : "border-[var(--border)]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${STATUS_DOT[contact.status]}/20`}>
                  <span className="text-[11px] font-bold text-[var(--on-surface)]">{contact.firstName[0]?.toUpperCase() || "?"}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--on-surface)] truncate">{contact.firstName}</p>
                  {contact.method === "instagram" && contact.methodValue ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--outline)] truncate">{contact.methodValue}</span>
                      <a href={`https://instagram.com/${contact.methodValue.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] text-[#E1306C] hover:underline shrink-0">IG</a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--outline)] truncate">{contact.methodValue || "—"}</p>
                  )}
                </div>
              </div>
              {/* Menu button */}
              <button
                ref={triggerRef}
                onClick={openMenu}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>
              </button>
              {showMenu && typeof document !== "undefined" && createPortal(
                <div ref={menuRef} className="fixed bg-[var(--surface-high)] border border-[var(--border)] rounded-xl shadow-xl py-1.5 min-w-[140px] animate-fade-in max-h-[260px] overflow-y-auto backdrop-blur-xl" style={{ top: Math.max(8, (menuPos?.top ?? 0) - 260), left: menuPos?.left ?? 0, zIndex: 9999 }}>
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickStatus(contact.id, s); setShowMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center gap-2 ${contact.status === s ? "text-[var(--primary)] font-medium bg-[var(--primary)]/5" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>,
                document.body,
              )}
            </div>
            {/* Tags */}
            {!compact && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">{tag}</span>
                ))}
              </div>
            )}
            {/* Reminders */}
            {contact.reminders.filter((r) => !r.done).length > 0 && (
              <div className="flex items-center gap-1 text-[9px] text-amber-400 mt-1.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                {contact.reminders.filter((r) => !r.done).length} rappel(s)
              </div>
            )}
            {/* Footer: time + status */}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[9px] ${stale ? "text-amber-400 font-medium" : "text-[var(--outline)]"}`}>
                {stale ? `${inactiveDays}j inactif` : timeSinceLabel(contact.lastInteractionDate)}
              </span>
              {!compact && (
                <Badge className={`!text-[8px] !px-1.5 !py-0 ${STATUS_COLORS[contact.status]}`}>{STATUS_LABELS[contact.status]}</Badge>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function ContactsPage() {
  const { contacts, loaded, add, updateStatus, archive, remove, addNote } = useContacts();
  const { interactions } = useInteractions();
  const { updatePipelineXP } = useGamification();
  const { isPremium } = useSubscription();
  const activeContacts = contacts.filter((c) => c.status !== "archived");
  const contactAtLimit = !isPremium && activeContacts.length >= FREE_LIMITS.activeContacts;
  const toast = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMethod, setNewMethod] = useState<ContactMethod>("instagram");
  const [newValue, setNewValue] = useState("");
  const [newStatus, setNewStatus] = useState<ContactStatus>("new");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContactStatus | "">("");
  const [filterMethod, setFilterMethod] = useState<ContactMethod | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkAction, setShowBulkAction] = useState<"delete" | "status" | "archive" | null>(null);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<ContactStatus>("contacted");

  // Quick note
  const [quickNoteId, setQuickNoteId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState("");

  // Archive suggestions
  const staleSuggestions = useMemo(() =>
    contacts.filter((c) => c.status !== "archived" && daysSince(c.lastInteractionDate) >= 14),
    [contacts]
  );
  const [showStaleSuggest, setShowStaleSuggest] = useState(false);

  // Progressive rendering for list view
  const INITIAL_VISIBLE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  useEffect(() => {
    const handleScroll = () => {
      if (viewMode !== "list") return;
      const scrollY = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY >= docHeight - 400) setVisibleCount((c) => c + 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [viewMode]);
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [searchQuery, filterStatus, filterMethod, showArchived]);

  // DnD state
  const [dragContactId, setDragContactId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ContactStatus | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ─── Filter logic ───────────────────────────────────
  const filtered = useMemo(() => {
    let result = contacts;
    if (!showArchived) result = result.filter((c) => c.status !== "archived");
    const q = searchQuery.toLowerCase();
    if (q) {
      result = result.filter((c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.methodValue.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterStatus) result = result.filter((c) => c.status === filterStatus);
    if (filterMethod) result = result.filter((c) => c.method === filterMethod);
    return result;
  }, [contacts, searchQuery, filterStatus, filterMethod, showArchived]);

  // ─── Status counts ──────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [contacts]);

  const activeFilterCount = [filterStatus, filterMethod].filter(Boolean).length;

  // ─── DnD handlers ───────────────────────────────────
  const handleDragStart = (contactId: string) => (e: React.DragEvent) => {
    setDragContactId(contactId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (status: ContactStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDrop = (targetStatus: ContactStatus) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragContactId) {
      await updateStatus(dragContactId, targetStatus);
    }
    setDragContactId(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => { setDragContactId(null); setDragOverStatus(null); };

  // ─── Touch DnD handlers (mobile) ───────────────────
  const touchDragRef = useRef<{ contactId: string; startY: number; startX: number; ghost: HTMLDivElement | null } | null>(null);

  const handleTouchDragStart = (contactId: string, contactName: string) => (e: React.TouchEvent) => {
    if (bulkMode) return;
    const touch = e.touches[0];
    const ghost = document.createElement("div");
    ghost.textContent = contactName;
    ghost.className = "fixed px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-medium shadow-lg pointer-events-none";
    ghost.style.zIndex = "99999";
    ghost.style.left = `${touch.clientX - 40}px`;
    ghost.style.top = `${touch.clientY - 20}px`;
    ghost.style.opacity = "0.9";
    document.body.appendChild(ghost);
    touchDragRef.current = { contactId, startX: touch.clientX, startY: touch.clientY, ghost };
    setDragContactId(contactId);
  };

  const handleTouchDragMove = useCallback((e: React.TouchEvent) => {
    const td = touchDragRef.current;
    if (!td) return;
    const touch = e.touches[0];
    if (td.ghost) {
      td.ghost.style.left = `${touch.clientX - 40}px`;
      td.ghost.style.top = `${touch.clientY - 20}px`;
    }
    let foundStatus: ContactStatus | null = null;
    columnRefs.current.forEach((el, status) => {
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        foundStatus = status as ContactStatus;
      }
    });
    setDragOverStatus(foundStatus);
  }, []);

  const handleTouchDragEnd = useCallback(async () => {
    const td = touchDragRef.current;
    if (!td) return;
    if (td.ghost) td.ghost.remove();
    if (dragOverStatus && td.contactId) {
      await updateStatus(td.contactId, dragOverStatus);
    }
    touchDragRef.current = null;
    setDragContactId(null);
    setDragOverStatus(null);
  }, [dragOverStatus, updateStatus]);

  // ─── Bulk handlers ──────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleBulkDelete = async () => {
    for (const id of selected) await remove(id);
    toast.show(`${selected.size} contact(s) supprimé(s)`);
    setSelected(new Set()); setBulkMode(false); setShowBulkAction(null);
  };

  const handleBulkStatus = async () => {
    for (const id of selected) await updateStatus(id, bulkTargetStatus);
    toast.show(`${selected.size} contact(s) mis à jour`);
    setSelected(new Set()); setBulkMode(false); setShowBulkAction(null);
  };

  const handleBulkArchive = async () => {
    for (const id of selected) await archive(id, "no_interest");
    setSelected(new Set()); setBulkMode(false); setShowBulkAction(null);
  };

  // ─── Quick note ─────────────────────────────────────
  const handleQuickNote = async () => {
    if (!quickNoteId || !quickNoteText.trim()) return;
    await addNote(quickNoteId, quickNoteText.trim());
    setQuickNoteId(null);
    setQuickNoteText("");
  };

  // ─── CSV Export ─────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Prénom", "Statut", "Méthode", "Valeur", "Tags", "Notes", "Dernière activité", "Créé le"];
    const rows = filtered.map((c) => [
      c.firstName, STATUS_LABELS[c.status], c.method, c.methodValue,
      c.tags.join(", "), (c.notes || "").replace(/\n/g, " "),
      new Date(c.lastInteractionDate).toLocaleDateString("fr-FR"),
      new Date(c.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pipeline_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Quick status from card ─────────────────────────
  const handleQuickStatus = async (id: string, status: ContactStatus) => {
    const contact = contacts.find((c) => c.id === id);
    if (status === "archived") {
      await archive(id, "no_interest");
    } else {
      await updateStatus(id, status);
      if (contact) {
        const oldIdx = PIPELINE_ORDER.indexOf(contact.status);
        const newIdx = PIPELINE_ORDER.indexOf(status);
        if (newIdx > oldIdx) {
          updatePipelineXP(contact.sourceInteractionId, status);
        }
      }
    }
  };

  if (!loaded) return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto animate-fade-in">
      <div className="h-7 w-40 bg-[var(--surface-bright)] rounded mb-2 animate-pulse" />
      <div className="h-4 w-64 bg-[var(--surface-bright)] rounded mb-6 animate-pulse" />
      <SkeletonKanban />
    </div>
  );

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-0.5">
            <span className="bg-gradient-to-r from-[#c084fc] to-[#34d399] bg-clip-text text-transparent animate-gradient-text">Pipeline</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            {activeContacts.length} contact{activeContacts.length > 1 ? "s" : ""} actif{activeContacts.length > 1 ? "s" : ""}
            {statusCounts["archived"] > 0 && <span className="text-[var(--outline)]"> · {statusCounts["archived"]} archivé{(statusCounts["archived"] || 0) > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPremium && (
            <button onClick={exportCSV} className="p-2 rounded-xl hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors" title="Exporter CSV">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </button>
          )}
          <Button onClick={() => setShowNew(true)} disabled={contactAtLimit}>
            + Contact{!isPremium ? ` (${activeContacts.length}/${FREE_LIMITS.activeContacts})` : ""}
          </Button>
        </div>
      </div>

      {/* Free user limit */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={activeContacts.length} limit={FREE_LIMITS.activeContacts} itemName="contacts actifs" />
        </div>
      )}

      {/* Stats + Funnel */}
      {contacts.length > 0 && (
        <>
          <StatsRow contacts={contacts} />
          <FunnelBar counts={statusCounts} total={activeContacts.length} />
        </>
      )}

      {/* Archive suggestion banner */}
      {staleSuggestions.length > 0 && (
        <button onClick={() => setShowStaleSuggest(true)} className="w-full mb-4 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-2.5 hover:bg-amber-500/10 transition-colors text-left">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <span className="text-xs text-amber-400 font-medium">{staleSuggestions.length} contact{staleSuggestions.length > 1 ? "s" : ""} inactif{staleSuggestions.length > 1 ? "s" : ""} depuis 14+ jours</span>
          <span className="text-[10px] text-amber-400/60 ml-auto shrink-0">Archiver</span>
        </button>
      )}

      {/* ── Controls ── */}
      <div className="flex items-center gap-2 mb-3">
        {/* View toggle */}
        <div className="flex bg-[var(--surface-high)] rounded-xl p-0.5 border border-[var(--border)]">
          {(["kanban", "list"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 text-xs rounded-lg transition-all ${viewMode === v ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"}`}>
              {v === "kanban" ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" /></svg>
                  Kanban
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                  Liste
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-[10px] text-[var(--outline)] cursor-pointer select-none">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded accent-[var(--primary)]" />
          Archivés
        </label>
        <button
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
          className={`px-3 py-1.5 text-xs rounded-xl transition-all ${bulkMode ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] border border-[var(--border)]"}`}
        >
          {bulkMode ? "Annuler" : "Sélection"}
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl pl-9 pr-3 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 h-9 text-xs rounded-xl transition-all border ${showFilters || activeFilterCount > 0 ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] border-[var(--border)]"}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
          Filtres{activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="!p-4 mb-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1.5 font-medium">Statut</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterStatus("")} className={`text-[10px] px-2 py-1 rounded-full transition-all ${!filterStatus ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>Tous</button>
                {ALL_STATUSES.map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`text-[10px] px-2 py-1 rounded-full transition-all flex items-center gap-1 ${filterStatus === s ? STATUS_COLORS[s] + " font-medium" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1.5 font-medium">Méthode</p>
              <div className="flex flex-wrap gap-1">
                {(["", "instagram", "phone", "other"] as (ContactMethod | "")[]).map((m) => (
                  <button key={m} onClick={() => setFilterMethod(m)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterMethod === m ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    {m === "" ? "Toutes" : m === "instagram" ? "Instagram" : m === "phone" ? "Téléphone" : "Autre"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterStatus(""); setFilterMethod(""); }} className="text-[10px] text-red-400 hover:underline flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              Réinitialiser
            </button>
          )}
        </Card>
      )}

      {/* Bulk action bar */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 animate-fade-in">
          <span className="text-xs text-[var(--primary)] font-semibold">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => setShowBulkAction("status")}>Statut</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowBulkAction("archive")}>Archiver</Button>
          <Button size="sm" variant="danger" onClick={() => setShowBulkAction("delete")}>Supprimer</Button>
        </div>
      )}

      {/* ── CONTENT ── */}
      {contacts.length === 0 ? (
        <EmptyState icon={<IconUsers size={32} className="text-[var(--primary)]" />} title="Aucun contact" description="Les contacts apparaissent ici quand tu obtiens un close lors d'une interaction." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconUsers size={28} />} title="Aucun résultat" description="Essaie d'ajuster tes filtres." />
      ) : viewMode === "kanban" ? (
        /* ── KANBAN VIEW ── */
        <div className="flex flex-col md:flex-row md:gap-3 md:overflow-x-auto md:pb-4 md:no-scrollbar gap-4" onDragEnd={handleDragEnd}>
          {(showArchived ? ALL_STATUSES : PIPELINE_ORDER).map((status) => {
            const items = filtered.filter((c) => c.status === status);
            if (items.length === 0 && viewMode === "kanban" && !showArchived) {
              // On mobile, hide empty columns; on desktop, show drop zone
              return (
                <div
                  key={status}
                  ref={(el) => { if (el) columnRefs.current.set(status, el); }}
                  className={`hidden md:block md:min-w-[240px] md:max-w-[260px] md:flex-shrink-0 transition-all ${dragOverStatus === status ? "ring-2 ring-[var(--primary)]/30 rounded-xl" : ""}`}
                  onDragOver={handleDragOver(status)}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={handleDrop(status)}
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                    <span className="text-[11px] font-semibold text-[var(--on-surface-variant)]">{STATUS_LABELS[status]}</span>
                    <span className="text-[10px] text-[var(--outline)]">0</span>
                  </div>
                  <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-[var(--border)] text-[10px] text-[var(--outline)]">
                    Glisser ici
                  </div>
                </div>
              );
            }
            if (items.length === 0) return null;
            return (
              <div
                key={status}
                ref={(el) => { if (el) columnRefs.current.set(status, el); }}
                className={`md:min-w-[240px] md:max-w-[260px] md:flex-shrink-0 transition-all ${dragOverStatus === status ? "ring-2 ring-[var(--primary)]/30 rounded-xl" : ""}`}
                onDragOver={handleDragOver(status)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={handleDrop(status)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                  <span className="text-[11px] font-semibold text-[var(--on-surface)]">{STATUS_LABELS[status]}</span>
                  <span className="text-[10px] text-[var(--outline)] font-medium">{items.length}</span>
                </div>
                {/* Cards */}
                <div className="space-y-2 min-h-[40px]">
                  {items.map((contact) => (
                    <div
                      key={contact.id}
                      className={`touch-manipulation ${dragContactId === contact.id ? "opacity-40 scale-95" : ""} transition-all`}
                      onTouchStart={handleTouchDragStart(contact.id, contact.firstName)}
                      onTouchMove={handleTouchDragMove}
                      onTouchEnd={handleTouchDragEnd}
                    >
                      <ContactCard
                        contact={contact}
                        onQuickStatus={handleQuickStatus}
                        bulkMode={bulkMode}
                        selected={selected.has(contact.id)}
                        onToggle={() => toggleSelect(contact.id)}
                        draggable={!bulkMode}
                        onDragStart={handleDragStart(contact.id)}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="space-y-2">
          {filtered.slice(0, visibleCount).map((c, idx) => (
            <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}>
              <ContactCard
                contact={c}
                onQuickStatus={handleQuickStatus}
                bulkMode={bulkMode}
                selected={selected.has(c.id)}
                onToggle={() => toggleSelect(c.id)}
              />
            </div>
          ))}
          {filtered.length > visibleCount && (
            <p className="text-center text-xs text-[var(--outline)] py-3">Scroll pour voir plus ({filtered.length - visibleCount} restants)</p>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* New contact */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau contact">
        <div className="space-y-4">
          <Input label="Prénom" placeholder="Prénom ou identifiant" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select label="Type de contact" options={[{ value: "instagram", label: "Instagram" }, { value: "phone", label: "Téléphone" }, { value: "other", label: "Autre" }]} value={newMethod} onChange={(e) => setNewMethod(e.target.value as ContactMethod)} />
          <Input label="Valeur" placeholder={newMethod === "instagram" ? "@pseudo" : "06..."} value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Select label="Statut" options={PIPELINE_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} value={newStatus} onChange={(e) => setNewStatus(e.target.value as ContactStatus)} />
          <Button disabled={!newName.trim()} onClick={async (e) => {
            const btn = e.currentTarget; if (btn.disabled) return; btn.disabled = true;
            await add({ firstName: newName.trim(), sourceInteractionId: "", method: newMethod, methodValue: newValue, status: newStatus, tags: [], notes: "" });
            setNewName(""); setNewValue(""); setNewStatus("new"); setShowNew(false);
          }}>Créer</Button>
        </div>
      </Modal>

      {/* Stale suggestions */}
      <Modal open={showStaleSuggest} onClose={() => setShowStaleSuggest(false)} title="Contacts inactifs">
        <p className="text-xs text-[var(--on-surface-variant)] mb-4">Ces contacts n&apos;ont pas eu d&apos;activité depuis plus de 14 jours.</p>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {staleSuggestions.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--surface-high)] border border-[var(--border)]">
              <div>
                <p className="text-xs font-semibold text-[var(--on-surface)]">{c.firstName}</p>
                <p className="text-[10px] text-[var(--outline)]">{daysSince(c.lastInteractionDate)}j sans activité · {STATUS_LABELS[c.status]}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { archive(c.id, "ghosted"); }}>Archiver</Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setShowStaleSuggest(false)}>Fermer</Button>
      </Modal>

      {/* Quick note modal */}
      <Modal open={!!quickNoteId} onClose={() => setQuickNoteId(null)} title="Note rapide">
        <div className="flex gap-2">
          <input
            placeholder="Note..."
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickNote()}
            className="flex-1 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          />
          <Button size="sm" onClick={handleQuickNote} disabled={!quickNoteText.trim()}>Ajouter</Button>
        </div>
      </Modal>

      {/* Bulk delete */}
      <Modal open={showBulkAction === "delete"} onClose={() => setShowBulkAction(null)} title="Supprimer">
        <p className="text-sm text-[var(--on-surface-variant)] mb-4">Supprimer {selected.size} contact{selected.size > 1 ? "s" : ""} ?</p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleBulkDelete}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setShowBulkAction(null)}>Annuler</Button>
        </div>
      </Modal>

      {/* Bulk archive */}
      <Modal open={showBulkAction === "archive"} onClose={() => setShowBulkAction(null)} title="Archiver">
        <p className="text-sm text-[var(--on-surface-variant)] mb-4">Archiver {selected.size} contact{selected.size > 1 ? "s" : ""} ?</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleBulkArchive}>Archiver</Button>
          <Button variant="ghost" onClick={() => setShowBulkAction(null)}>Annuler</Button>
        </div>
      </Modal>

      {/* Bulk status change */}
      <Modal open={showBulkAction === "status"} onClose={() => setShowBulkAction(null)} title="Changer le statut">
        <Select label="Nouveau statut" options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} value={bulkTargetStatus} onChange={(e) => setBulkTargetStatus(e.target.value as ContactStatus)} />
        <div className="flex gap-2 mt-4">
          <Button onClick={handleBulkStatus}>Appliquer</Button>
          <Button variant="ghost" onClick={() => setShowBulkAction(null)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
