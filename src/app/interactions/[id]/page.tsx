"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
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
  const { contacts } = useContacts();
  const { allSessions } = useSessions();
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const interaction = getById(id);
  if (!interaction) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[var(--on-surface-variant)] mb-4">Interaction introuvable</p><Button variant="secondary" onClick={() => router.push("/interactions")}>Retour</Button></div>;

  // Find linked contact
  const linkedContact = contacts.find((c) => c.sourceInteractionId === id);
  // Find linked session
  const linkedSession = interaction.sessionId ? allSessions.find((s) => s.id === interaction.sessionId) : null;

  if (editing) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Annuler
        </button>
        <h1 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight mb-6">Modifier</h1>
        <InteractionForm initial={interaction} onSubmit={(data) => { update(id, data); setEditing(false); }} />
      </div>
    );
  }

  const displayName = interaction.firstName || interaction.memorableElement || "Anonyme";

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/interactions")} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Interactions
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--on-surface)] tracking-tight mb-2">{displayName}</h1>
          {interaction.firstName && interaction.memorableElement && (
            <p className="text-sm text-[var(--on-surface-variant)] mb-2 italic">{interaction.memorableElement}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={TYPE_COLORS[interaction.type]}>{APPROACH_LABELS[interaction.type]}</Badge>
            <Badge className={RESULT_COLORS[interaction.result]}>{RESULT_LABELS[interaction.result]}</Badge>
            {interaction.objection && (
              <Badge className="bg-[#fb7185]/15 text-[#fb7185]">
                {interaction.objection === "other" && interaction.objectionCustom ? interaction.objectionCustom : OBJECTION_LABELS[interaction.objection]}
              </Badge>
            )}
            <span className="text-xs text-[var(--outline)]">{formatDate(interaction.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Supprimer</Button>
        </div>
      </div>

      {/* Tags */}
      {(interaction.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(interaction.tags ?? []).map((t) => (
            <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">#{t}</span>
          ))}
        </div>
      )}

      {/* Scores grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Ressenti</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{interaction.feelingScore}<span className="text-sm text-[var(--outline)]">/10</span></p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Note fille</p>
          <p className="text-2xl font-bold text-[var(--tertiary)]">{interaction.womanScore ?? "-"}<span className="text-sm text-[var(--outline)]">/10</span></p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Duree</p>
          <p className="text-sm font-semibold text-[var(--on-surface)]">{DURATION_LABELS[interaction.duration]}</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-[10px] text-[var(--outline)] uppercase tracking-wider mb-1">Type</p>
          <p className="text-sm font-semibold text-[var(--on-surface)]">{APPROACH_LABELS[interaction.type]}</p>
        </Card>
      </div>

      {/* Linked session */}
      {linkedSession && (
        <Link href={`/sessions/${linkedSession.id}`}>
          <Card hover className="mb-4 !p-4 border border-cyan-500/10">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
              <span className="text-cyan-400 font-medium">Session :</span>
              <span className="text-[var(--on-surface-variant)]">{linkedSession.title || "Session"}</span>
              {linkedSession.location && <span className="text-[10px] text-[var(--outline)]">· {linkedSession.location}</span>}
              <svg className="w-3 h-3 text-[var(--outline)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </div>
          </Card>
        </Link>
      )}

      {/* Linked contact */}
      {linkedContact && (
        <Link href={`/pipeline`}>
          <Card hover className="mb-4 !p-4 border border-emerald-500/10">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              <span className="text-emerald-400 font-medium">Contact :</span>
              <span className="text-[var(--on-surface-variant)]">{linkedContact.firstName}</span>
              <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">{linkedContact.status}</Badge>
              <svg className="w-3 h-3 text-[var(--outline)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </div>
          </Card>
        </Link>
      )}

      {/* Location */}
      {interaction.location && (
        <Card className="mb-4 !p-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="text-[var(--on-surface-variant)]">{interaction.location}</span>
          </div>
        </Card>
      )}

      {/* Contact info */}
      {interaction.contactMethod && interaction.contactValue && (
        <Card className="mb-4 !p-4 border border-emerald-500/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400 font-medium">Contact:</span>
            <span className="text-[var(--on-surface-variant)]">{interaction.contactValue}</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">{interaction.contactMethod}</Badge>
          </div>
        </Card>
      )}

      {/* Context photo */}
      {interaction.contextPhoto && (
        <Card className="mb-4 !p-4">
          <h3 className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Photo de contexte</h3>
          <img src={interaction.contextPhoto} alt="Contexte" className="w-full max-h-64 object-cover rounded-xl" />
        </Card>
      )}

      {/* Discussion topics */}
      {interaction.discussionTopics && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Sujets de discussion</h3>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed whitespace-pre-wrap">{interaction.discussionTopics}</p>
        </Card>
      )}

      {/* Notes */}
      {interaction.note && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed whitespace-pre-wrap">{interaction.note}</p>
        </Card>
      )}

      {/* Feedback */}
      {interaction.feedback && (
        <Card className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Feedback personnel</h3>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed whitespace-pre-wrap">{interaction.feedback}</p>
        </Card>
      )}

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer">
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Es-tu sur ? Cette action est irreversible.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={() => { remove(id); router.push("/interactions"); }}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
