"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useContacts } from "@/hooks/useContacts";
import { useInteractions } from "@/hooks/useInteractions";
import { useGamification } from "@/hooks/useGamification";
import { STATUS_LABELS, STATUS_COLORS, ARCHIVE_REASON_LABELS, XP_VALUES, type ContactStatus, type ArchiveReason } from "@/types";
import { formatDate, formatRelative } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

const PIPELINE_STEPS: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, updateStatus, archive, addNote, addReminder, toggleReminder, remove, loaded } = useContacts();
  const { interactions } = useInteractions();
  const { addXP } = useGamification();
  const [noteInput, setNoteInput] = useState("");
  const [reminderLabel, setReminderLabel] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>("ghosted");
  const [archiveCustom, setArchiveCustom] = useState("");

  const PIPELINE_XP: Partial<Record<ContactStatus, { amount: number; reason: string }>> = {
    contacted: { amount: XP_VALUES.pipeline_contacted, reason: "Contact contacte" },
    replied: { amount: XP_VALUES.pipeline_replied, reason: "Reponse recue" },
    date_planned: { amount: XP_VALUES.pipeline_date_planned, reason: "Date planifie" },
    first_date: { amount: XP_VALUES.pipeline_first_date, reason: "Premier date" },
    kissclose: { amount: XP_VALUES.pipeline_kissclose, reason: "Kiss close" },
    fuckclose: { amount: XP_VALUES.pipeline_fuckclose, reason: "Fuck close" },
  };

  const handleStatusChange = async (newStatus: ContactStatus) => {
    const c = getById(id);
    if (!c) return;
    await updateStatus(id, newStatus);
    const xp = PIPELINE_XP[newStatus];
    if (xp) {
      const oldIdx = PIPELINE_STEPS.indexOf(c.status);
      const newIdx = PIPELINE_STEPS.indexOf(newStatus);
      if (newIdx > oldIdx) addXP(xp.amount, xp.reason);
    }
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const contact = getById(id);
  if (!contact) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[var(--on-surface-variant)] mb-4">Contact introuvable</p><Button variant="secondary" onClick={() => router.push("/contacts")}>Retour</Button></div>;

  // Source interaction
  const sourceInteraction = contact.sourceInteractionId
    ? interactions.find((i) => i.id === contact.sourceInteractionId)
    : null;

  // Pipeline progress
  const currentStepIdx = PIPELINE_STEPS.indexOf(contact.status);

  // Status change events for timeline duration calc
  const statusChanges = contact.timeline
    .filter((e) => e.type === "status_change")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const inactiveDays = daysSince(contact.lastInteractionDate);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/contacts")} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Pipeline
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
            <span className="text-xl font-bold text-[var(--primary)]">{contact.firstName[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">{contact.firstName}</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">{contact.methodValue || "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_COLORS[contact.status]}>{STATUS_LABELS[contact.status]}</Badge>
              {inactiveDays >= 5 && contact.status !== "archived" && (
                <span className="text-[10px] text-amber-400 font-medium">{inactiveDays}j sans activite</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.status !== "archived" && <Button variant="secondary" size="sm" onClick={() => setShowArchive(true)}>Archiver</Button>}
          <Button variant="danger" size="sm" onClick={() => { remove(id); router.push("/contacts"); }}>Supprimer</Button>
        </div>
      </div>

      {/* Pipeline progress bar (#12) */}
      {contact.status !== "archived" && (
        <Card className="mb-6 !p-4">
          <h2 className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">Progression pipeline</h2>
          <div className="flex items-center gap-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step} className="flex-1 flex flex-col items-center">
                  <button
                    onClick={() => handleStatusChange(step)}
                    className={`w-full h-2 rounded-full transition-all ${
                      isCurrent ? "bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/30" :
                      isActive ? "bg-[var(--primary)]/40" : "bg-[var(--surface-bright)]"
                    } hover:bg-[var(--primary)]/60`}
                    title={STATUS_LABELS[step]}
                  />
                  <span className={`text-[7px] mt-1 whitespace-nowrap ${isCurrent ? "text-[var(--primary)] font-medium" : isActive ? "text-[var(--on-surface-variant)]" : "text-[var(--outline)]"}`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Duration between steps */}
          {statusChanges.length >= 2 && (
            <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--outline)]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span>
                {daysBetween(contact.createdAt, contact.lastInteractionDate)}j depuis le close
              </span>
              {statusChanges.length >= 2 && (
                <span>
                   · Derniere etape : {daysBetween(statusChanges[statusChanges.length - 2].date, statusChanges[statusChanges.length - 1].date)}j
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Source interaction link (#14) */}
      {sourceInteraction && (
        <Link href={`/interactions/${sourceInteraction.id}`}>
          <Card hover className="mb-4 !p-4 border border-[var(--primary)]/10">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
              <span className="text-[var(--primary)] font-medium">Interaction source :</span>
              <span className="text-[var(--on-surface-variant)]">
                {sourceInteraction.firstName || sourceInteraction.memorableElement || "Interaction"}
              </span>
              <span className="text-[10px] text-[var(--outline)]">· {formatRelative(sourceInteraction.date)}</span>
              {sourceInteraction.location && <span className="text-[10px] text-[var(--outline)]">· {sourceInteraction.location}</span>}
              <svg className="w-3 h-3 text-[var(--outline)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </div>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((t) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">{t}</span>)}
            </div>
          )}

          {/* Timeline */}
          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Timeline</h2>
            <div className="space-y-4">
              {[...contact.timeline].reverse().map((event, idx) => {
                const isStatus = event.type === "status_change";
                const isNote = event.type === "note";
                const isReminder = event.type === "reminder";
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                        isStatus ? "bg-[var(--primary)]" :
                        isNote ? "bg-[var(--tertiary)]" :
                        isReminder ? "bg-amber-400" : "bg-[var(--outline)]"
                      }`} />
                      {idx < contact.timeline.length - 1 && <div className="w-px flex-1 bg-[var(--surface-high)]" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[var(--on-surface)]/90">{event.content}</p>
                        {isStatus && <Badge className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)]">Statut</Badge>}
                        {isNote && <Badge className="text-[8px] bg-[var(--tertiary)]/10 text-[var(--tertiary)]">Note</Badge>}
                        {isReminder && <Badge className="text-[8px] bg-amber-400/10 text-amber-400">Rappel</Badge>}
                      </div>
                      <p className="text-[10px] text-[var(--outline)] mt-1">{formatDate(event.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick note (#13) */}
          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Ajouter une note</h2>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Note rapide..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && noteInput.trim()) { addNote(id, noteInput.trim()); setNoteInput(""); } }} className="flex-1" />
              <Button size="md" disabled={!noteInput.trim()} onClick={() => { addNote(id, noteInput.trim()); setNoteInput(""); }}>Ajouter</Button>
            </div>
            {/* Quick note shortcuts */}
            <div className="flex flex-wrap gap-1">
              {["Message envoye", "Elle a repondu", "Date fixe", "Relance envoyee", "Vu mais pas repondu"].map((q) => (
                <button key={q} onClick={() => { addNote(id, q); }} className="text-[10px] px-2 py-1 rounded-full bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)] hover:text-[var(--primary)] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Status selector */}
          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Statut</h2>
            <div className="space-y-1.5">
              {PIPELINE_STEPS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    contact.status === s
                      ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                      : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] hover:text-[var(--on-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${contact.status === s ? "bg-[var(--primary)]" : "bg-[var(--outline)]"}`} />
                    {STATUS_LABELS[s]}
                  </div>
                </button>
              ))}
              <button
                onClick={() => handleStatusChange("archived")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  contact.status === "archived"
                    ? "bg-[var(--outline)]/15 text-[var(--outline)]"
                    : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${contact.status === "archived" ? "bg-[var(--outline)]" : "bg-[var(--outline)]"}`} />
                  {STATUS_LABELS["archived"]}
                </div>
              </button>
            </div>
          </Card>

          {/* Rappels */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Rappels</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReminder(true)}>+</Button>
            </div>
            {contact.reminders.length === 0 ? (
              <p className="text-xs text-[var(--outline)]">Aucun rappel</p>
            ) : (
              <div className="space-y-2">
                {contact.reminders.map((r) => (
                  <div key={r.id} onClick={() => toggleReminder(id, r.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-high)] cursor-pointer hover:bg-[var(--surface-highest)] transition-all ${r.done ? "opacity-40" : ""}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${r.done ? "bg-emerald-500 border-emerald-500" : "border-amber-400"}`}>
                      {r.done && <svg className="w-3 h-3 text-[var(--on-surface)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--on-surface)] truncate">{r.label}</p>
                      <p className="text-[10px] text-[var(--outline)]">{formatDate(r.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Info card */}
          <Card className="!p-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--outline)]">Methode</span>
                <span className="text-[var(--on-surface)]">{contact.method === "instagram" ? "Instagram" : contact.method === "phone" ? "Telephone" : "Autre"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--outline)]">Contact</span>
                <span className="text-[var(--on-surface)]">{contact.methodValue || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--outline)]">Cree le</span>
                <span className="text-[var(--on-surface)]">{formatDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--outline)]">Derniere activite</span>
                <span className="text-[var(--on-surface)]">{formatRelative(contact.lastInteractionDate)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {contact.status === "archived" && contact.archiveInfo && (
        <Card className="mt-4 !p-4 border border-[var(--outline-variant)]/10">
          <p className="text-xs font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider mb-1">Motif d&apos;archivage</p>
          <p className="text-sm text-[var(--on-surface-variant)]">
            {contact.archiveInfo.reason === "other" && contact.archiveInfo.customReason
              ? contact.archiveInfo.customReason
              : ARCHIVE_REASON_LABELS[contact.archiveInfo.reason]}
          </p>
        </Card>
      )}

      <Modal open={showReminder} onClose={() => setShowReminder(false)} title="Nouveau rappel">
        <div className="space-y-4">
          <Input label="Label" placeholder="Ex: Relancer dans 48h" value={reminderLabel} onChange={(e) => setReminderLabel(e.target.value)} />
          <Input label="Date" type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
          <Button disabled={!reminderLabel.trim() || !reminderDate} onClick={() => { addReminder(id, reminderLabel, reminderDate); setReminderLabel(""); setReminderDate(""); setShowReminder(false); }}>Ajouter</Button>
        </div>
      </Modal>

      <Modal open={showArchive} onClose={() => setShowArchive(false)} title="Archiver le contact">
        <div className="space-y-4">
          <Select label="Motif" options={Object.entries(ARCHIVE_REASON_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={archiveReason} onChange={(e) => setArchiveReason(e.target.value as ArchiveReason)} />
          {archiveReason === "other" && (
            <Input label="Preciser" placeholder="Motif personnalise..." value={archiveCustom} onChange={(e) => setArchiveCustom(e.target.value)} />
          )}
          <Button variant="danger" onClick={() => { archive(id, archiveReason, archiveReason === "other" ? archiveCustom : undefined); setShowArchive(false); }}>Archiver</Button>
        </div>
      </Modal>
    </div>
  );
}
