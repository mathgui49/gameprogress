"use client";

import { useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useGamification } from "@/hooks/useGamification";
import type { JournalTag } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS, XP_VALUES } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconPenLine } from "@/components/ui/Icons";

const ALL_TAGS: JournalTag[] = ["mindset", "progress", "fear", "reflection", "review", "motivation"];

export default function JournalPage() {
  const { entries, loaded, add, update, remove } = useJournal();
  const { addXP } = useGamification();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<JournalTag | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Journal</h1>
          <p className="text-sm text-[#a09bb2]">{entries.length} entree{entries.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Ecrire</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={<IconPenLine size={28} />} title="Journal vide" description="Commence a ecrire pour suivre tes ressentis et ta progression." action={<Button onClick={() => setShowNew(true)}>Premiere entree</Button>} />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const expanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <Card hover onClick={() => setExpandedId(expanded ? null : entry.id)} className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#6b6580]">{formatDate(entry.date)}</p>
                      {entry.tag && <Badge className={JOURNAL_TAG_COLORS[entry.tag]}>{JOURNAL_TAG_LABELS[entry.tag]}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); setContent(entry.content); setTag(entry.tag); setShowNew(true); }} className="text-[#6b6580] hover:text-[#c084fc] transition-colors text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); remove(entry.id); }} className="text-[#6b6580] hover:text-[#fb7185] transition-colors text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm text-[#a09bb2] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
                    {entry.content}
                  </p>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setEditingId(null); setContent(""); setTag(null); }} title={editingId ? "Modifier l'entree" : "Nouvelle entree"}>
        <div className="space-y-4">
          <TextArea placeholder="Comment tu te sens aujourd'hui ? Qu'est-ce qui s'est passe ?..." rows={6} value={content} onChange={(e) => setContent(e.target.value)} className="text-base" />
          <div>
            <p className="text-xs text-[#a09bb2] mb-2">Tag (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    tag === t ? JOURNAL_TAG_COLORS[t] : "bg-[#1a1626] text-[#a09bb2] hover:bg-[#231e30]"
                  }`}
                >
                  {JOURNAL_TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <Button disabled={!content.trim()} onClick={() => {
            if (editingId) { update(editingId, content.trim(), tag); } else { add(content.trim(), tag); addXP(XP_VALUES.journal_entry, "Entree journal"); }
            setContent(""); setTag(null); setEditingId(null); setShowNew(false);
          }}>
            {editingId ? "Modifier" : "Enregistrer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
