"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import type { Contact, ContactStatus, ContactMethod, ArchiveReason } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, ARCHIVE_REASON_LABELS } from "@/types";
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
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

const PIPELINE_ORDER: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"];
const ALL_STATUSES: ContactStatus[] = [...PIPELINE_ORDER, "archived"];

type ViewMode = "kanban" | "list";

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
    <Card className="!p-4 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--surface-bright)]" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-[var(--surface-bright)] rounded mb-1" />
          <div className="h-2 w-14 bg-[var(--surface-bright)] rounded" />
        </div>
      </div>
      <div className="h-2 w-24 bg-[var(--surface-bright)] rounded" />
    </Card>
  );
}

function SkeletonKanban() {
  return (
    <div className="flex flex-col lg:flex-row lg:gap-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="lg:min-w-[280px]">
          <div className="h-5 w-16 bg-[var(--surface-bright)] rounded-full mb-3 animate-pulse" />
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contact card for Kanban ──────────────────────────
function ContactCard({
  contact,
  onQuickStatus,
  bulkMode,
  selected,
  onToggle,
  draggable,
  onDragStart,
}: {
  contact: Contact;
  onQuickStatus: (id: string, status: ContactStatus) => void;
  bulkMode: boolean;
  selected: boolean;
  onToggle: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inactiveDays = daysSince(contact.lastInteractionDate);
  const stale = inactiveDays >= 5 && contact.status !== "archived";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
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
        {/* Mobile drag handle — opens status picker on tap */}
        {draggable && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
            className="md:hidden shrink-0 w-6 h-8 flex items-center justify-center rounded-md text-[var(--outline)]/50 active:bg-[var(--surface-bright)] touch-manipulation"
            aria-label="Déplacer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          </button>
        )}
        {bulkMode && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            className={`w-5 h-5 shrink-0 rounded-md border-2 transition-all flex items-center justify-center ${selected ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}
          >
            {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
          </button>
        )}
        <Link href={`/contacts/${contact.id}`} className="flex-1 min-w-0">
          <Card hover className={`!p-3 ${stale ? "border border-amber-500/20" : ""}`}>
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center relative">
                  <svg className="w-4 h-4 text-[var(--primary)]/30 absolute" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span className="text-[10px] font-bold text-[var(--primary)] relative z-10">{contact.firstName[0]?.toUpperCase() || "?"}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--on-surface)]">{contact.firstName}</p>
                  {contact.method === "instagram" && contact.methodValue ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[var(--outline)]">{contact.methodValue}</span>
                      <a href={`https://instagram.com/${contact.methodValue.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] text-[#E1306C] hover:underline">profil</a>
                      <a href={`https://ig.me/m/${contact.methodValue.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] text-[#E1306C] hover:underline">DM</a>
                    </div>
                  ) : (
                    <p className="text-[9px] text-[var(--outline)]">{contact.methodValue || "—"}</p>
                  )}
                </div>
              </div>
              {/* Quick status menu */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-1 rounded-md hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 bottom-full mb-1 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-50 min-w-[130px] animate-fade-in max-h-[240px] overflow-y-auto">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickStatus(contact.id, s); setShowMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${contact.status === s ? "text-[var(--primary)] font-medium bg-[var(--primary)]/5" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {contact.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">{tag}</span>
                ))}
              </div>
            )}
            {contact.reminders.filter((r) => !r.done).length > 0 && (
              <div className="flex items-center gap-1 text-[9px] text-amber-400 mb-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                {contact.reminders.filter((r) => !r.done).length} rappel(s)
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[9px] ${stale ? "text-amber-400 font-medium" : "text-[var(--outline)]"}`}>
                {stale ? `${inactiveDays}j sans activité` : timeSinceLabel(contact.lastInteractionDate)}
              </span>
              <Badge className={`!text-[8px] !px-1.5 !py-0 ${STATUS_COLORS[contact.status]}`}>{STATUS_LABELS[contact.status]}</Badge>
            </div>
          </Card>
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

  // DnD state
  const [dragContactId, setDragContactId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ContactStatus | null>(null);

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
      // Update pipeline XP (replaces the interaction's XP with new coef)
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
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#c084fc] to-[#34d399] bg-clip-text text-transparent">Pipeline</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Suis tes contacts du close jusqu&apos;au date — {contacts.filter((c) => c.status !== "archived").length} actif{contacts.filter((c) => c.status !== "archived").length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={isPremium ? exportCSV : undefined} className={`p-2 rounded-lg transition-colors ${isPremium ? "hover:bg-[var(--surface-bright)] text-[var(--outline)]" : "text-[var(--outline)]/40 cursor-not-allowed"}`} title={isPremium ? "Exporter CSV" : "Export réservé à GameMax"}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          </button>
          <Button onClick={() => setShowNew(true)} disabled={contactAtLimit}>+ Contact{!isPremium ? ` (${activeContacts.length}/${FREE_LIMITS.activeContacts})` : ""}</Button>
        </div>
      </div>

      {/* Limit banner for free users */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={activeContacts.length} limit={FREE_LIMITS.activeContacts} itemName="contacts actifs" />
        </div>
      )}

      {/* Status counts bar */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {PIPELINE_ORDER.map((s) => (
          <div key={s} className="shrink-0 text-center">
            <div className={`text-sm font-bold ${statusCounts[s] ? "text-[var(--on-surface)]" : "text-[var(--outline)]"}`}>{statusCounts[s] || 0}</div>
            <div className="text-[8px] text-[var(--outline)] uppercase tracking-wider whitespace-nowrap">{STATUS_LABELS[s]}</div>
          </div>
        ))}
        {statusCounts["archived"] > 0 && (
          <div className="shrink-0 text-center opacity-50">
            <div className="text-sm font-bold text-[var(--outline)]">{statusCounts["archived"]}</div>
            <div className="text-[8px] text-[var(--outline)] uppercase tracking-wider">Archivé</div>
          </div>
        )}
      </div>

      {/* Archive suggestion banner */}
      {staleSuggestions.length > 0 && (
        <button onClick={() => setShowStaleSuggest(true)} className="w-full mb-4 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-2 hover:bg-amber-500/10 transition-colors text-left">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <span className="text-xs text-amber-400">{staleSuggestions.length} contact{staleSuggestions.length > 1 ? "s" : ""} sans activité depuis 14+ jours</span>
          <span className="text-[10px] text-amber-400/60 ml-auto">Archiver ?</span>
        </button>
      )}

      {/* Controls: view toggle, search, filters, bulk */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-[var(--surface-high)] rounded-lg p-0.5">
          {(["kanban", "list"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 text-xs rounded-md transition-all ${viewMode === v ? "bg-[var(--primary)] text-white" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}>
              {v === "kanban" ? "Kanban" : "Liste"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-[10px] text-[var(--outline)]">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" />
          Archivés
        </label>
        <button
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${bulkMode ? "bg-red-500/10 text-red-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}
        >
          {bulkMode ? "Annuler" : "Sélectionner"}
        </button>
      </div>

      {/* Search + filter button */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            placeholder="Rechercher par nom, contact, note, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg pl-9 pr-3 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1 px-3 h-9 text-xs rounded-lg transition-all ${showFilters || activeFilterCount > 0 ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          Filtres{activeFilterCount > 0 && <span className="ml-1 w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="!p-4 mb-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Statut</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterStatus("")} className={`text-[10px] px-2 py-1 rounded-full transition-all ${!filterStatus ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface)]" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>Tous</button>
                {ALL_STATUSES.map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterStatus === s ? STATUS_COLORS[s] : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>{STATUS_LABELS[s]}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Méthode</p>
              <div className="flex flex-wrap gap-1">
                {(["", "instagram", "phone", "other"] as (ContactMethod | "")[]).map((m) => (
                  <button key={m} onClick={() => setFilterMethod(m)} className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterMethod === m ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"}`}>
                    {m === "" ? "Toutes" : m === "instagram" ? "Instagram" : m === "phone" ? "Téléphone" : "Autre"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterStatus(""); setFilterMethod(""); }} className="text-[10px] text-red-400 hover:underline">Reinitialiser</button>
          )}
        </Card>
      )}

      {/* Bulk action bar */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 animate-fade-in">
          <span className="text-xs text-[var(--primary)] font-medium">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => setShowBulkAction("status")}>Changer statut</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowBulkAction("archive")}>Archiver</Button>
          <Button size="sm" variant="danger" onClick={() => setShowBulkAction("delete")}>Supprimer</Button>
        </div>
      )}

      {/* CONTENT */}
      {contacts.length === 0 ? (
        <EmptyState icon={<IconUsers size={32} className="text-[var(--primary)]" />} title="Aucun contact" description="Les contacts apparaissent ici quand tu obtiens un close lors d'une interaction." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconUsers size={28} />} title="Aucun résultat" description="Essaie d'ajuster tes filtres." />
      ) : viewMode === "kanban" ? (
        /* ── KANBAN VIEW ── */
        <div className="flex flex-col md:flex-row md:gap-3 md:overflow-x-auto md:pb-4 md:no-scrollbar gap-6" onDragEnd={handleDragEnd}>
          {(showArchived ? ALL_STATUSES : PIPELINE_ORDER).map((status) => {
            const items = filtered.filter((c) => c.status === status);
            return (
              <div
                key={status}
                className={`md:min-w-[240px] md:max-w-[260px] md:flex-shrink-0 transition-all ${dragOverStatus === status ? "ring-2 ring-[var(--primary)]/30 rounded-xl" : ""}`}
                onDragOver={handleDragOver(status)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={handleDrop(status)}
              >
                <div className="flex items-center gap-2 mb-2 px-1 md:sticky md:top-0 bg-[var(--background)] z-10 py-1">
                  <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-[10px] text-[var(--outline)]">{items.length}</span>
                </div>
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar min-h-[60px]">
                  {items.length === 0 ? (
                    <div className="hidden md:flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-[var(--border)] text-[10px] text-[var(--outline)]">
                      Glisser ici
                    </div>
                  ) : items.map((contact) => (
                    <div key={contact.id} className="min-w-[220px] md:min-w-0">
                      <ContactCard
                        contact={contact}
                        onQuickStatus={handleQuickStatus}
                        bulkMode={bulkMode}
                        selected={selected.has(contact.id)}
                        onToggle={() => toggleSelect(contact.id)}
                        draggable={!bulkMode}
                        onDragStart={handleDragStart(contact.id)}
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
          {filtered.map((c, idx) => (
            <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
              <ContactCard
                contact={c}
                onQuickStatus={handleQuickStatus}
                bulkMode={bulkMode}
                selected={selected.has(c.id)}
                onToggle={() => toggleSelect(c.id)}
              />
            </div>
          ))}
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
        <p className="text-xs text-[var(--on-surface-variant)] mb-4">Ces contacts n&apos;ont pas eu d&apos;activite depuis plus de 14 jours. Souhaites-tu les archiver ?</p>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {staleSuggestions.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-high)]">
              <div>
                <p className="text-xs font-medium text-[var(--on-surface)]">{c.firstName}</p>
                <p className="text-[10px] text-[var(--outline)]">{daysSince(c.lastInteractionDate)}j — {STATUS_LABELS[c.status]}</p>
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
            className="flex-1 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none"
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
