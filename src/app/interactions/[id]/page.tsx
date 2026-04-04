"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS, TYPE_COLORS, DURATION_LABELS, OBJECTION_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InteractionForm } from "@/components/interactions/InteractionForm";

export default function InteractionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, remove, update, loaded } = useInteractions();
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const interaction = getById(id);
  if (!interaction) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[#adaaab] mb-4">Interaction introuvable</p><Button variant="secondary" onClick={() => router.push("/interactions")}>Retour</Button></div>;

  if (editing) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-sm text-[#adaaab] hover:text-white transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Annuler
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Modifier</h1>
        <InteractionForm initial={interaction} onSubmit={(data) => { update(id, data); setEditing(false); }} />
      </div>
    );
  }

  const displayName = interaction.firstName || interaction.memorableElement || "Anonyme";

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/interactions")} className="flex items-center gap-1 text-sm text-[#adaaab] hover:text-white transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Interactions
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">{displayName}</h1>
          {interaction.firstName && interaction.memorableElement && (
            <p className="text-sm text-[#adaaab] mb-2 italic">{interaction.memorableElement}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={TYPE_COLORS[interaction.type]}>{APPROACH_LABELS[interaction.type]}</Badge>
            <Badge className={RESULT_COLORS[interaction.result]}>{RESULT_LABELS[interaction.result]}</Badge>
            {interaction.objection && (
              <Badge className="bg-[#ff6e84]/15 text-[#ff6e84]">
                {interaction.objection === "other" && interaction.objectionCustom ? interaction.objectionCustom : OBJECTION_LABELS[interaction.objection]}
              </Badge>
            )}
            <span className="text-xs text-[#484849]">{formatDate(interaction.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Supprimer</Button>
        </div>
      </div>

      {/* Scores grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[#484849] uppercase tracking-wider mb-1">Ressenti</p>
          <p className="text-2xl font-bold text-[#85adff]">{interaction.feelingScore}<span className="text-sm text-[#484849]">/10</span></p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[#484849] uppercase tracking-wider mb-1">Note fille</p>
          <p className="text-2xl font-bold text-[#ac8aff]">{interaction.womanScore ?? "-"}<span className="text-sm text-[#484849]">/10</span></p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[#484849] uppercase tracking-wider mb-1">Confiance</p>
          <p className="text-2xl font-bold text-cyan-400">{interaction.confidenceScore ?? "-"}<span className="text-sm text-[#484849]">/10</span></p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[#484849] uppercase tracking-wider mb-1">Duree</p>
          <p className="text-sm font-semibold text-white">{DURATION_LABELS[interaction.duration]}</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[#484849] uppercase tracking-wider mb-1">Type</p>
          <p className="text-sm font-semibold text-white">{APPROACH_LABELS[interaction.type]}</p>
        </Card>
      </div>

      {/* Location */}
      {interaction.location && (
        <Card className="mb-4 !p-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-[#484849]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-[#adaaab]">{interaction.location}</span>
          </div>
        </Card>
      )}

      {/* Contact info */}
      {interaction.contactMethod && interaction.contactValue && (
        <Card className="mb-4 !p-4 border border-emerald-500/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400 font-medium">Contact:</span>
            <span className="text-[#adaaab]">
              {interaction.contactMethod === "instagram" ? interaction.contactValue : interaction.contactMethod === "phone" ? interaction.contactValue : interaction.contactValue}
            </span>
            <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">{interaction.contactMethod}</Badge>
          </div>
        </Card>
      )}

      {/* Discussion topics */}
      {interaction.discussionTopics && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[#adaaab] uppercase tracking-wider mb-2">Sujets de discussion</h3>
          <p className="text-sm text-[#adaaab] leading-relaxed whitespace-pre-wrap">{interaction.discussionTopics}</p>
        </Card>
      )}

      {/* Notes */}
      {interaction.note && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[#adaaab] uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-[#adaaab] leading-relaxed whitespace-pre-wrap">{interaction.note}</p>
        </Card>
      )}

      {/* Feedback */}
      {interaction.feedback && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[#adaaab] uppercase tracking-wider mb-2">Feedback personnel</h3>
          <p className="text-sm text-[#adaaab] leading-relaxed whitespace-pre-wrap">{interaction.feedback}</p>
        </Card>
      )}

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer">
        <p className="text-sm text-[#adaaab] mb-6">Es-tu sur ? Cette action est irreversible.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={() => { remove(id); router.push("/interactions"); }}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
