"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import { STATUS_LABELS, STATUS_COLORS, ARCHIVE_REASON_LABELS, type ContactStatus, type ArchiveReason } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

const ALL_STATUSES: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced", "archived"];

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, updateStatus, archive, addNote, addReminder, toggleReminder, remove, loaded } = useContacts();
  const [noteInput, setNoteInput] = useState("");
  const [reminderLabel, setReminderLabel] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>("ghosted");
  const [archiveCustom, setArchiveCustom] = useState("");

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const contact = getById(id);
  if (!contact) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[var(--on-surface-variant)] mb-4">Contact introuvable</p><Button variant="secondary" onClick={() => router.push("/contacts")}>Retour</Button></div>;

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
            <p className="text-sm text-[var(--on-surface-variant)]">{contact.method === "instagram" ? contact.methodValue : contact.methodValue}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.status !== "archived" && <Button variant="secondary" size="sm" onClick={() => setShowArchive(true)}>Archiver</Button>}
          <Button variant="danger" size="sm" onClick={() => { remove(id); router.push("/contacts"); }}>Supprimer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((t) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">{t}</span>)}
            </div>
          )}

          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Timeline</h2>
            <div className="space-y-4">
              {[...contact.timeline].reverse().map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5" />
                    <div className="w-px flex-1 bg-[var(--surface-high)]" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-[var(--on-surface)]/90">{event.content}</p>
                    <p className="text-[10px] text-[var(--outline)] mt-1">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Ajouter une note</h2>
            <div className="flex gap-2">
              <Input placeholder="Note rapide..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="flex-1" />
              <Button size="md" disabled={!noteInput.trim()} onClick={() => { addNote(id, noteInput.trim()); setNoteInput(""); }}>Ajouter</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Statut</h2>
            <div className="space-y-1.5">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(id, s)}
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
            </div>
          </Card>

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
            <Input label="Préciser" placeholder="Motif personnalisé..." value={archiveCustom} onChange={(e) => setArchiveCustom(e.target.value)} />
          )}
          <Button variant="danger" onClick={() => { archive(id, archiveReason, archiveReason === "other" ? archiveCustom : undefined); setShowArchive(false); }}>Archiver</Button>
        </div>
      </Modal>
    </div>
  );
}
