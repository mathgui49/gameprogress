"use client";

import { useState, useRef, useCallback } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useGamification } from "@/hooks/useGamification";
import type { JournalTag, Visibility, JournalAttachment } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS, XP_VALUES } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconPenLine } from "@/components/ui/Icons";

const ALL_TAGS: JournalTag[] = ["mindset", "progress", "fear", "reflection", "review", "motivation"];

const VISIBILITY_LABELS: Record<Visibility, string> = { private: "Privé", wings: "Wings", public: "Public" };

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
  const { entries, loaded, add, update, remove } = useJournal();
  const { addXP } = useGamification();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tag, setTag] = useState<JournalTag | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [attachments, setAttachments] = useState<JournalAttachment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openEditor = (entry?: typeof entries[0]) => {
    if (entry) {
      setEditingId(entry.id);
      setTag(entry.tag);
      setVisibility(entry.visibility ?? "private");
      setAttachments(entry.attachments ?? []);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = entry.content;
      }, 50);
    } else {
      setEditingId(null);
      setTag(null);
      setVisibility("private");
      setAttachments([]);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = "";
      }, 50);
    }
    setShowNew(true);
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML?.trim() || "";
    if (!content || content === "<br>") return;
    if (editingId) {
      update(editingId, content, tag, visibility);
    } else {
      add(content, tag, visibility, "entry", null, attachments);
      addXP(XP_VALUES.journal_entry, "Entrée journal");
    }
    setShowNew(false);
    setEditingId(null);
    setAttachments([]);
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#67e8f9] to-[#c084fc] bg-clip-text text-transparent">Journal</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{entries.length} entrée{entries.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => openEditor()}>+ Écrire</Button>
      </div>

      {/* Explanation */}
      <Card className="mb-6 !p-4 border border-[var(--primary)]/10">
        <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
          Le journal est ton espace personnel. Écris des posts <strong className="text-[var(--primary)]">publics</strong> visibles dans le feed de la communauté, <strong className="text-[var(--tertiary)]">pour tes wings</strong> uniquement, ou bien <strong className="text-[var(--on-surface-variant)]">privés</strong> comme un journal de bord intime. Les field reports de sessions apparaissent également ici.
        </p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState icon={<IconPenLine size={28} />} title="Journal vide" description="Commence à écrire pour suivre tes ressentis et ta progression." action={<Button onClick={() => openEditor()}>Première entrée</Button>} />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
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
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip text="Modifier" position="bottom">
                        <button onClick={(e) => { e.stopPropagation(); openEditor(entry); }} className="text-[var(--outline)] hover:text-[var(--primary)] transition-colors text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                        </button>
                      </Tooltip>
                      <Tooltip text="Supprimer" position="bottom">
                        <button onClick={(e) => { e.stopPropagation(); remove(entry.id); }} className="text-[var(--outline)] hover:text-[#fb7185] transition-colors text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <div
                    className={`text-sm text-[var(--on-surface-variant)] leading-relaxed journal-content ${expanded ? "" : "line-clamp-4"}`}
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                  />
                  {/* Attachment previews */}
                  {entry.attachments && entry.attachments.length > 0 && expanded && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.attachments.map((att, i) => (
                        att.type === "image" ? (
                          <img key={i} src={att.url} alt={att.name} className="w-24 h-24 rounded-lg object-cover border border-[var(--border)]" />
                        ) : (
                          <a key={i} href={att.url} download={att.name} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-high)] text-[var(--primary)] hover:bg-[var(--surface-bright)] transition-colors">
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
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setEditingId(null); setAttachments([]); }} title={editingId ? "Modifier l'entrée" : "Nouvelle entrée"}>
        <div className="space-y-4">
          {/* Rich editor */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-high)]">
            <RichEditorToolbar editorRef={editorRef} />
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[200px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm text-[var(--on-surface)] focus:outline-none journal-content"
              data-placeholder="Écris ton post ici... Partage tes ressentis, ta progression, un field report..."
              suppressContentEditableWarning
            />
          </div>

          {/* File attachments */}
          <div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors border border-[var(--border)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
              Joindre photo / fichier
            </button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--on-surface-variant)] border border-[var(--border)]">
                    {att.type === "image" ? (
                      <img src={att.url} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    )}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-[var(--outline)] hover:text-[#fb7185] transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tag */}
          <div>
            <p className="text-xs text-[var(--on-surface-variant)] mb-2">Tag (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    tag === t ? JOURNAL_TAG_COLORS[t] : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}
                >
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
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    visibility === v
                      ? v === "private" ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]" : v === "wings" ? "bg-[var(--tertiary)]/20 text-[var(--tertiary)]" : "bg-emerald-400/20 text-emerald-400"
                      : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}
                >
                  {VISIBILITY_LABELS[v]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--outline)] mt-1.5">
              {visibility === "private" ? "Visible uniquement par toi, comme un journal intime." : visibility === "wings" ? "Partagé avec tes wings uniquement." : "Visible dans le feed de la communauté."}
            </p>
          </div>

          <Button onClick={handleSave}>
            {editingId ? "Modifier" : "Publier"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
