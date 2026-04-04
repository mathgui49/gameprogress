"use client";

import { useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import type { JournalTag } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

const ALL_TAGS: JournalTag[] = ["mindset", "progress", "fear", "reflection", "review", "motivation"];

export default function JournalPage() {
  const { entries, loaded, add, update, remove } = useJournal();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<JournalTag | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Journal</h1>
          <p className="text-sm text-[#adaaab]">{entries.length} entree{entries.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Ecrire</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="📝" title="Journal vide" description="Commence a ecrire pour suivre tes ressentis et ta progression." action={<Button onClick={() => setShowNew(true)}>Premiere entree</Button>} />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const expanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <Card hover onClick={() => setExpandedId(expanded ? null : entry.id)} className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#484849]">{formatDate(entry.date)}</p>
                      {entry.tag && <Badge className={JOURNAL_TAG_COLORS[entry.tag]}>{JOURNAL_TAG_LABELS[entry.tag]}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); setContent(entry.content); setTag(entry.tag); setShowNew(true); }} className="text-[#484849] hover:text-[#85adff] transition-colors text-xs">✎</button>
                      <button onClick={(e) => { e.stopPropagation(); remove(entry.id); }} className="text-[#484849] hover:text-[#ff6e84] transition-colors text-xs">✕</button>
                    </div>
                  </div>
                  <p className={`text-sm text-[#adaaab] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
                    {entry.content}
                  </p>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* New entry modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setEditingId(null); setContent(""); setTag(null); }} title={editingId ? "Modifier l'entree" : "Nouvelle entree"}>
        <div className="space-y-4">
          <TextArea placeholder="Comment tu te sens aujourd'hui ? Qu'est-ce qui s'est passe ?..." rows={6} value={content} onChange={(e) => setContent(e.target.value)} className="text-base" />
          <div>
            <p className="text-xs text-[#adaaab] mb-2">Tag (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    tag === t ? JOURNAL_TAG_COLORS[t] : "bg-[#262627] text-[#adaaab] hover:bg-[#2c2c2d]"
                  }`}
                >
                  {JOURNAL_TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <Button disabled={!content.trim()} onClick={() => {
            if (editingId) { update(editingId, content.trim(), tag); } else { add(content.trim(), tag); }
            setContent(""); setTag(null); setEditingId(null); setShowNew(false);
          }}>
            {editingId ? "Modifier" : "Enregistrer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
