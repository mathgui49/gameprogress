"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useGamification } from "@/hooks/useGamification";
import { useInteractions } from "@/hooks/useInteractions";
import { useWingRequests } from "@/hooks/useWingRequests";
import type { JournalTag, Visibility, JournalAttachment, JournalEntry, JournalDraft, Interaction } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS, XP } from "@/types";
import { formatDate, formatDateShort, generateId } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useSubscription } from "@/hooks/useSubscription";
import { LimitReachedBanner } from "@/components/ui/PremiumGate";
import { FREE_LIMITS, countThisMonth } from "@/lib/premium";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { VoiceInput } from "@/components/ui/VoiceInput";
import { IconPenLine } from "@/components/ui/Icons";
import { useToast } from "@/hooks/useToast";

const ALL_TAGS: JournalTag[] = ["mindset", "progress", "fear", "reflection", "review", "motivation"];
const VISIBILITY_LABELS: Record<Visibility, string> = { private: "Privé", wings: "Wings", public: "Public" };

type ViewMode = "list" | "calendar" | "collections";

function RichEditorToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]/50">
      <button type="button" onClick={() => exec("bold")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Gras">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
      </button>
      <button type="button" onClick={() => exec("italic")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Italique">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0l-4 16m0 0h4" /></svg>
      </button>
      <button type="button" onClick={() => exec("underline")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Souligner">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 20h12M8 4v8a4 4 0 008 0V4" /></svg>
      </button>
      <div className="w-px h-5 bg-[var(--border)] mx-1" />
      <button type="button" onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Liste">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
      </button>
      <button type="button" onClick={() => exec("insertOrderedList")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Liste numérotée">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6h11M10 12h11M10 18h11M3 6h1m-1 6h1m-1 6h1" /></svg>
      </button>
      <div className="w-px h-5 bg-[var(--border)] mx-1" />
      <button type="button" onClick={() => { const url = prompt("URL du lien:"); if (url) exec("createLink", url); }} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Lien">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.812a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.07 8.07" /></svg>
      </button>
      <button type="button" onClick={() => exec("formatBlock", "h3")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Titre">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>
      </button>
      <button type="button" onClick={() => exec("formatBlock", "blockquote")} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--on-surface-variant)]" title="Citation">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
      </button>
    </div>
  );
}

export default function JournalPage() {
  const {
    entries, loaded, add, update, remove, getById,
    search, filter, entriesByDate,
    collections, addCollection, updateCollection, removeCollection, addEntryToCollection, removeEntryFromCollection,
    drafts, saveDraft, autoSaveDraft, removeDraft,
    createShareLink, exportEntries,
    fetchContributions, addContribution,
  } = useJournal();
  const { addXP } = useGamification();
  const { interactions } = useInteractions();
  const { wingProfiles } = useWingRequests();
  const { isPremium } = useSubscription();
  const monthlyEntryCount = useMemo(() => countThisMonth(entries), [entries]);
  const journalAtLimit = !isPremium && monthlyEntryCount >= FREE_LIMITS.journalEntriesPerMonth;
  const toast = useToast();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<JournalTag | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<Visibility | null>(null);
  const [filterCollectionId, setFilterCollectionId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Editor state
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tag, setTag] = useState<JournalTag | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [attachments, setAttachments] = useState<JournalAttachment[]>([]);
  const [linkedInteractionIds, setLinkedInteractionIds] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [writingMode, setWritingMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share modal
  const [shareEntryId, setShareEntryId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareExpiry, setShareExpiry] = useState<string>("");

  // Collection modal
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Collaborative modal
  const [collabEntryId, setCollabEntryId] = useState<string | null>(null);
  const [collabContributions, setCollabContributions] = useState<any[]>([]);
  const [collabInput, setCollabInput] = useState("");

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Computed entries
  const displayEntries = useMemo(() => {
    let result = entries;

    if (searchQuery.trim()) {
      result = search(searchQuery);
    }

    if (filterTag || filterVisibility || filterCollectionId) {
      result = filter({
        tag: filterTag,
        visibility: filterVisibility ?? undefined,
        collectionId: filterCollectionId ?? undefined,
      });
      // Apply search on top if needed
      if (searchQuery.trim()) {
        const lower = searchQuery.toLowerCase();
        result = result.filter((e) => e.content.toLowerCase().includes(lower));
      }
    }

    return result;
  }, [entries, searchQuery, filterTag, filterVisibility, filterCollectionId, search, filter]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; entries: JournalEntry[] }[] = [];

    // Adjust for Monday start (0=Mon, 6=Sun)
    const startPad = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startPad; i++) days.push({ date: "", day: 0, entries: [] });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, entries: entriesByDate[dateStr] || [] });
    }
    return days;
  }, [calendarMonth, entriesByDate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      setAttachments((prev) => [...prev, { type: isImage ? "image" : "file", url, name: file.name }]);
      if (isImage && editorRef.current) {
        document.execCommand("insertImage", false, url);
      }
    });
    e.target.value = "";
  }, []);

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const openEditor = (entry?: JournalEntry, draft?: JournalDraft) => {
    if (entry) {
      setEditingId(entry.id);
      setTag(entry.tag);
      setVisibility(entry.visibility ?? "private");
      setAttachments(entry.attachments ?? []);
      setLinkedInteractionIds(entry.linkedInteractionIds ?? []);
      setSelectedCollectionId(entry.collectionId ?? null);
      setIsCollaborative(entry.isCollaborative ?? false);
      setDraftId(null);
      setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = entry.content; }, 50);
    } else if (draft) {
      setEditingId(null);
      setTag(draft.tag);
      setVisibility(draft.visibility ?? "private");
      setAttachments([]);
      setLinkedInteractionIds(draft.linkedInteractionIds ?? []);
      setSelectedCollectionId(draft.collectionId ?? null);
      setDraftId(draft.id);
      setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = draft.content; }, 50);
    } else {
      setEditingId(null);
      setTag(null);
      setVisibility("private");
      setAttachments([]);
      setLinkedInteractionIds([]);
      setSelectedCollectionId(null);
      setIsCollaborative(false);
      setDraftId(generateId());
      setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = ""; }, 50);
    }
    setShowNew(true);
  };

  // Auto-save draft on content change
  const handleEditorInput = useCallback(() => {
    if (!draftId || editingId) return;
    const content = editorRef.current?.innerHTML?.trim() || "";
    if (!content || content === "<br>") return;
    autoSaveDraft({
      id: draftId,
      content,
      tag,
      visibility,
      linkedInteractionIds,
      collectionId: selectedCollectionId,
      lastSavedAt: new Date().toISOString(),
    });
  }, [draftId, editingId, tag, visibility, linkedInteractionIds, selectedCollectionId, autoSaveDraft]);

  const handleSave = async () => {
    if (submitting) return;
    const content = editorRef.current?.innerHTML?.trim() || "";
    if (!content || content === "<br>") return;
    setSubmitting(true);
    if (editingId) {
      update(editingId, content, tag, visibility, linkedInteractionIds, selectedCollectionId);
    } else {
      add(content, tag, visibility, "entry", null, attachments, linkedInteractionIds, selectedCollectionId, isCollaborative);
      const wordCount = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
      addXP(wordCount > 200 ? XP.journal_entry_long : XP.journal_entry, "Entrée journal", "journal");
      if (draftId) removeDraft(draftId);
    }
    toast.show(editingId ? "Entrée modifiée" : "Entrée publiée !");
    setSubmitting(false);
    setShowNew(false);
    setEditingId(null);
    setAttachments([]);
    setDraftId(null);
  };

  const handleVoiceResult = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML += `<p>${text}</p>`;
      handleEditorInput();
    }
  }, [handleEditorInput]);

  const handleShare = async (entryId: string) => {
    const result = await createShareLink(entryId, shareExpiry ? new Date(shareExpiry).toISOString() : null);
    if (result) {
      setShareLink(`${window.location.origin}/journal/share/${result.token}`);
    }
  };

  const handleExport = (format: "markdown" | "text") => {
    const content = exportEntries(format);
    const blob = new Blob([content], { type: format === "markdown" ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-export.${format === "markdown" ? "md" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleOpenCollab = async (entryId: string) => {
    const contribs = await fetchContributions(entryId);
    setCollabContributions(contribs);
    setCollabEntryId(entryId);
  };

  const handleAddContribution = async () => {
    if (!collabInput.trim() || !collabEntryId) return;
    await addContribution(collabEntryId, collabInput);
    const contribs = await fetchContributions(collabEntryId);
    setCollabContributions(contribs);
    setCollabInput("");
  };

  // Sanitized interactions for linking (no personal info of the girl visible to others)
  const safeInteractions = useMemo(() =>
    interactions.map((i: Interaction) => ({
      id: i.id,
      date: i.date,
      type: i.type,
      result: i.result,
      location: i.location,
      tags: i.tags,
      firstName: i.firstName,
    })),
    [interactions]
  );

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  return (
    <div className={`px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in ${writingMode ? "journal-writing-mode" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#67e8f9] to-[#c084fc] bg-clip-text text-transparent">Journal</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{entries.length} entrée{entries.length > 1 ? "s" : ""}{drafts.length > 0 ? ` · ${drafts.length} brouillon${drafts.length > 1 ? "s" : ""}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip text="Mode écriture (sombre)" position="bottom">
            <button onClick={() => setWritingMode(!writingMode)} className={`p-2 rounded-lg transition-colors ${writingMode ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            </button>
          </Tooltip>
          <Button size="sm" variant="ghost" onClick={isPremium ? () => setShowExportModal(true) : undefined} disabled={!isPremium} title={isPremium ? "Exporter" : "Export réservé à GameMax"}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          </Button>
          <Button onClick={() => openEditor()} disabled={journalAtLimit}>+ Écrire{!isPremium ? ` (${monthlyEntryCount}/${FREE_LIMITS.journalEntriesPerMonth})` : ""}</Button>
        </div>
      </div>

      {/* Limit banner for free users */}
      {!isPremium && (
        <div className="mb-4">
          <LimitReachedBanner current={monthlyEntryCount} limit={FREE_LIMITS.journalEntriesPerMonth} itemName="rédactions" />
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3 mb-4">
        <Input
          placeholder="Rechercher dans le journal..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-lg">
            {(["list", "calendar", "collections"] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${viewMode === mode ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)]"}`}>
                {mode === "list" ? "Liste" : mode === "calendar" ? "Calendrier" : "Collections"}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          {ALL_TAGS.map((t) => (
            <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)}
              className={`text-[10px] px-2 py-1 rounded-full transition-all ${filterTag === t ? JOURNAL_TAG_COLORS[t] : "bg-[var(--surface-low)] text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
              {JOURNAL_TAG_LABELS[t]}
            </button>
          ))}

          {/* Visibility filter */}
          {(["private", "wings", "public"] as Visibility[]).map((v) => (
            <button key={v} onClick={() => setFilterVisibility(filterVisibility === v ? null : v)}
              className={`text-[10px] px-2 py-1 rounded-full transition-all ${
                filterVisibility === v
                  ? v === "private" ? "bg-[var(--on-surface)]/15 text-[var(--on-surface)] font-medium" : v === "wings" ? "bg-[var(--tertiary)]/20 text-[var(--tertiary)] font-medium" : "bg-emerald-400/20 text-emerald-400 font-medium"
                  : "bg-[var(--surface-low)] text-[var(--outline)]"
              }`}>
              {VISIBILITY_LABELS[v]}
            </button>
          ))}

          {(filterTag || filterVisibility || filterCollectionId || searchQuery) && (
            <button onClick={() => { setFilterTag(null); setFilterVisibility(null); setFilterCollectionId(null); setSearchQuery(""); }}
              className="text-[10px] text-[var(--primary)] hover:underline">Réinitialiser</button>
          )}
        </div>
      </div>

      {/* Drafts banner */}
      {drafts.length > 0 && viewMode === "list" && (
        <Card className="mb-4 !p-3 !border-amber-400/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-amber-400">Brouillons ({drafts.length})</p>
          </div>
          <div className="space-y-1.5">
            {drafts.slice(0, 3).map((draft) => (
              <div key={draft.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-low)]">
                <button onClick={() => openEditor(undefined, draft)} className="text-xs text-[var(--on-surface-variant)] truncate flex-1 text-left">
                  {draft.content.replace(/<[^>]*>/g, "").slice(0, 60)}...
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[9px] text-[var(--outline)]">{formatDateShort(draft.lastSavedAt)}</span>
                  <button onClick={() => removeDraft(draft.id)} className="text-[var(--outline)] hover:text-[#fb7185]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* VIEW: List */}
      {viewMode === "list" && (
        displayEntries.length === 0 ? (
          <EmptyState icon={<IconPenLine size={28} />} title="Journal vide" description={searchQuery || filterTag ? "Aucune entrée ne correspond aux filtres." : "Commence à écrire pour suivre tes ressentis."} action={!searchQuery && !filterTag ? <Button onClick={() => openEditor()}>Première entrée</Button> : undefined} />
        ) : (
          <div className="space-y-3">
            {displayEntries.map((entry, idx) => {
              const expanded = expandedId === entry.id;
              const isFieldReport = entry.entryType === "fieldreport";
              return (
                <div key={entry.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <Card hover onClick={() => setExpandedId(expanded ? null : entry.id)} className="!p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-[var(--outline)]">{formatDate(entry.date)}</p>
                        {isFieldReport && <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">Field Report</Badge>}
                        {entry.tag && <Badge className={JOURNAL_TAG_COLORS[entry.tag]}>{JOURNAL_TAG_LABELS[entry.tag]}</Badge>}
                        {entry.visibility && entry.visibility !== "private" && (
                          <Badge className={entry.visibility === "wings" ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" : "bg-emerald-400/15 text-emerald-400"}>
                            {VISIBILITY_LABELS[entry.visibility]}
                          </Badge>
                        )}
                        {entry.isCollaborative && <Badge className="bg-cyan-400/15 text-cyan-400">Collaboratif</Badge>}
                        {entry.linkedInteractionIds && entry.linkedInteractionIds.length > 0 && (
                          <Badge className="bg-[var(--primary)]/10 text-[var(--primary)]">{entry.linkedInteractionIds.length} interaction{entry.linkedInteractionIds.length > 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {entry.visibility !== "private" && (
                          <Tooltip text="Partager" position="bottom">
                            <button onClick={(e) => { e.stopPropagation(); setShareEntryId(entry.id); }} className="text-[var(--outline)] hover:text-[var(--primary)] transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                            </button>
                          </Tooltip>
                        )}
                        {entry.isCollaborative && (
                          <Tooltip text="Contributions" position="bottom">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenCollab(entry.id); }} className="text-[var(--outline)] hover:text-cyan-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip text="Modifier" position="bottom">
                          <button onClick={(e) => { e.stopPropagation(); openEditor(entry); }} className="text-[var(--outline)] hover:text-[var(--primary)] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                          </button>
                        </Tooltip>
                        <Tooltip text="Supprimer" position="bottom">
                          <button onClick={(e) => { e.stopPropagation(); remove(entry.id); }} className="text-[var(--outline)] hover:text-[#fb7185] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className={`text-sm text-[var(--on-surface-variant)] leading-relaxed journal-content ${expanded ? "" : "line-clamp-4"}`} dangerouslySetInnerHTML={{ __html: entry.content }} />
                    {entry.attachments && entry.attachments.length > 0 && expanded && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {entry.attachments.map((att, i) => (
                          att.type === "image" ? (
                            <img key={i} src={att.url} alt={att.name} className="w-24 h-24 rounded-lg object-cover border border-[var(--border)]" />
                          ) : (
                            <a key={i} href={att.url} download={att.name} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-high)] text-[var(--primary)]">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                              {att.name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* VIEW: Calendar */}
      {viewMode === "calendar" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <p className="text-sm font-semibold text-[var(--on-surface)]">
              {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-[10px] text-[var(--outline)] font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[60px] rounded-lg p-1 text-center ${
                  day.date
                    ? day.entries.length > 0
                      ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20 cursor-pointer hover:border-[var(--primary)]/40"
                      : "bg-[var(--surface-low)] border border-transparent"
                    : ""
                }`}
                onClick={() => {
                  if (day.entries.length > 0) {
                    setViewMode("list");
                    // Could add date filter here
                  }
                }}
              >
                {day.date && (
                  <>
                    <p className={`text-[10px] font-medium ${day.entries.length > 0 ? "text-[var(--primary)]" : "text-[var(--outline)]"}`}>{day.day}</p>
                    {day.entries.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {day.entries.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-[var(--primary)]" />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Collections */}
      {viewMode === "collections" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--on-surface)]">Collections ({collections.length})</p>
            <Button size="sm" onClick={() => setShowCollectionModal(true)}>+ Collection</Button>
          </div>

          {collections.length === 0 ? (
            <EmptyState icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>}
              title="Aucune collection" description="Crée des dossiers pour organiser tes entrées par thème."
              action={<Button onClick={() => setShowCollectionModal(true)}>Créer une collection</Button>}
            />
          ) : (
            <div className="space-y-3">
              {collections.map((col) => (
                <Card key={col.id} hover className="!p-4" onClick={() => { setFilterCollectionId(col.id); setViewMode("list"); }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--on-surface)]">{col.name}</p>
                      {col.description && <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{col.description}</p>}
                      <p className="text-[10px] text-[var(--outline)] mt-1">{col.entryIds.length} entrée{col.entryIds.length > 1 ? "s" : ""}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeCollection(col.id); }} className="text-[var(--outline)] hover:text-[#fb7185]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── EDITOR MODAL ─────────────────────────────── */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setEditingId(null); setAttachments([]); setDraftId(null); }} title={editingId ? "Modifier l'entrée" : "Nouvelle entrée"}>
        <div className="space-y-4">
          {/* Rich editor */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-high)]">
            <RichEditorToolbar editorRef={editorRef} />
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[120px] sm:min-h-[200px] max-h-[250px] sm:max-h-[400px] overflow-y-auto px-3 sm:px-4 py-3 text-sm text-[var(--on-surface)] focus:outline-none journal-content"
              data-placeholder="Écris ton post ici..."
              suppressContentEditableWarning
              onInput={handleEditorInput}
            />
          </div>

          {/* Voice + File */}
          <div className="flex items-center gap-2 flex-wrap">
            <VoiceInput onResult={handleVoiceResult} />
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.m4a" onChange={handleFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors border border-[var(--border)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
              Joindre fichier
            </button>
            {draftId && !editingId && <span className="text-[10px] text-amber-400 ml-auto">Brouillon auto-sauvegardé</span>}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--on-surface-variant)] border border-[var(--border)]">
                  {att.type === "image" ? <img src={att.url} alt="" className="w-8 h-8 rounded object-cover" /> : <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-[var(--outline)] hover:text-[#fb7185]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link interactions — collapsible */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              Lier des interactions ({linkedInteractionIds.length} sélectionnée{linkedInteractionIds.length > 1 ? "s" : ""})
            </summary>
            <div className="mt-2">
              <p className="text-[10px] text-[var(--outline)] mb-2">Les infos personnelles ne seront jamais visibles par tes wings ou le public.</p>
              <div className="max-h-[120px] overflow-y-auto space-y-1">
                {safeInteractions.slice(0, 20).map((i: any) => (
                  <button key={i.id} onClick={() => setLinkedInteractionIds((prev) => prev.includes(i.id) ? prev.filter((x) => x !== i.id) : [...prev, i.id])}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${linkedInteractionIds.includes(i.id) ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30" : "bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}>
                    {formatDateShort(i.date)} · {i.firstName || i.result}{i.location ? ` · ${i.location}` : ""}
                  </button>
                ))}
              </div>
            </div>
          </details>

          {/* Tag */}
          <div>
            <p className="text-xs text-[var(--on-surface-variant)] mb-2">Tag (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button key={t} onClick={() => setTag(tag === t ? null : t)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${tag === t ? JOURNAL_TAG_COLORS[t] : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"}`}>
                  {JOURNAL_TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <p className="text-xs text-[var(--on-surface-variant)] mb-2">Visibilité</p>
            <div className="flex gap-2">
              {(["private", "wings", "public"] as Visibility[]).map((v) => (
                <button key={v} onClick={() => setVisibility(v)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    visibility === v
                      ? v === "private" ? "bg-[var(--on-surface)]/15 text-[var(--on-surface)] font-medium ring-1 ring-[var(--on-surface)]/20" : v === "wings" ? "bg-[var(--tertiary)]/20 text-[var(--tertiary)] font-medium ring-1 ring-[var(--tertiary)]/30" : "bg-emerald-400/20 text-emerald-400 font-medium ring-1 ring-emerald-400/30"
                      : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}>
                  {VISIBILITY_LABELS[v]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--outline)] mt-1.5">
              {visibility === "private" ? "Visible uniquement par toi." : visibility === "wings" ? "Partagé avec tes wings uniquement." : "Visible dans le feed de la communauté."}
            </p>
          </div>

          {/* Collection */}
          {collections.length > 0 && (
            <div>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2">Collection (optionnel)</p>
              <div className="flex flex-wrap gap-2">
                {collections.map((col) => (
                  <button key={col.id} onClick={() => setSelectedCollectionId(selectedCollectionId === col.id ? null : col.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${selectedCollectionId === col.id ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}`}>
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collaborative toggle */}
          {visibility !== "private" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} className="rounded" />
              <span className="text-xs text-[var(--on-surface-variant)]">Permettre les contributions (entrée collaborative)</span>
            </label>
          )}

          <Button onClick={handleSave} disabled={submitting}>{submitting ? "Publication..." : editingId ? "Modifier" : "Publier"}</Button>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal open={!!shareEntryId} onClose={() => { setShareEntryId(null); setShareLink(null); setShareExpiry(""); }} title="Partager l'entrée">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Génère un lien de partage pour cette entrée.</p>
          <Input type="date" value={shareExpiry} onChange={(e) => setShareExpiry(e.target.value)} placeholder="Expiration (optionnel)" />
          <p className="text-[10px] text-[var(--outline)]">Laisse vide pour un lien permanent.</p>
          {!shareLink && <Button onClick={() => shareEntryId && handleShare(shareEntryId)}>Générer le lien</Button>}
          {shareLink && (
            <div className="p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
              <p className="text-xs text-[var(--on-surface)] break-all font-mono">{shareLink}</p>
              <Button size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(shareLink)}>Copier</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Collection Modal */}
      <Modal open={showCollectionModal} onClose={() => { setShowCollectionModal(false); setNewCollectionName(""); }} title="Nouvelle collection">
        <div className="space-y-3">
          <Input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Nom de la collection..." onKeyDown={(e) => e.key === "Enter" && newCollectionName.trim() && (addCollection(newCollectionName), setShowCollectionModal(false), setNewCollectionName(""))} />
          <Button onClick={() => { if (newCollectionName.trim()) { addCollection(newCollectionName); setShowCollectionModal(false); setNewCollectionName(""); } }}>Créer</Button>
        </div>
      </Modal>

      {/* Collaborative Modal */}
      <Modal open={!!collabEntryId} onClose={() => { setCollabEntryId(null); setCollabContributions([]); setCollabInput(""); }} title="Contributions collaboratives">
        <div className="space-y-3">
          {collabContributions.length === 0 ? (
            <p className="text-xs text-[var(--outline)] text-center py-4">Aucune contribution encore.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {collabContributions.map((c: any) => {
                const profile = wingProfiles.find((p) => p.userId === c.authorId);
                return (
                  <Card key={c.id} className="!p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--primary)]">{profile?.firstName || "Anonyme"}</span>
                      <span className="text-[10px] text-[var(--outline)]">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="text-sm text-[var(--on-surface-variant)]" dangerouslySetInnerHTML={{ __html: c.content }} />
                  </Card>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={collabInput} onChange={(e) => setCollabInput(e.target.value)} placeholder="Ajoute ta contribution..." onKeyDown={(e) => e.key === "Enter" && handleAddContribution()} className="flex-1" />
            <Button size="sm" onClick={handleAddContribution}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Exporter le journal">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Exporte toutes tes entrées dans le format de ton choix.</p>
          <div className="flex gap-3">
            <Button onClick={() => handleExport("markdown")} className="flex-1">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Markdown
            </Button>
            <Button variant="ghost" onClick={() => handleExport("text")} className="flex-1">
              Texte brut
            </Button>
          </div>
        </div>
      </Modal>

      {/* Writing mode CSS */}
      <style jsx global>{`
        .journal-writing-mode {
          background: var(--surface) !important;
        }
        .journal-writing-mode .journal-content {
          font-family: 'Georgia', serif;
          font-size: 16px;
          line-height: 1.8;
          color: var(--on-surface);
        }
      `}</style>
    </div>
  );
}
