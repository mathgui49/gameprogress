"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import { STATUS_LABELS, STATUS_COLORS, type ContactStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const ALL_STATUSES: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "date_done", "advanced", "archived"];

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, updateStatus, addNote, addReminder, remove, loaded } = useContacts();
  const [noteInput, setNoteInput] = useState("");
  const [reminderLabel, setReminderLabel] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [showReminder, setShowReminder] = useState(false);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const contact = getById(id);
  if (!contact) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[#adaaab] mb-4">Contact introuvable</p><Button variant="secondary" onClick={() => router.push("/contacts")}>Retour</Button></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/contacts")} className="flex items-center gap-1 text-sm text-[#adaaab] hover:text-white transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Pipeline
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#85adff]/20 to-[#ac8aff]/20 flex items-center justify-center">
            <span className="text-xl font-bold text-[#85adff]">{contact.firstName[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{contact.firstName}</h1>
            <p className="text-sm text-[#adaaab]">{contact.method === "instagram" ? contact.methodValue : contact.methodValue}</p>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => { remove(id); router.push("/contacts"); }}>Supprimer</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((t) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-[#ac8aff]/10 text-[#ac8aff]">{t}</span>)}
            </div>
          )}

          {/* Timeline */}
          <Card>
            <h2 className="text-base font-semibold text-white mb-4">Timeline</h2>
            <div className="space-y-4">
              {[...contact.timeline].reverse().map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[#85adff] mt-1.5" />
                    <div className="w-px flex-1 bg-[#262627]" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-white/90">{event.content}</p>
                    <p className="text-[10px] text-[#484849] mt-1">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Add note */}
          <Card>
            <h2 className="text-base font-semibold text-white mb-3">Ajouter une note</h2>
            <div className="flex gap-2">
              <Input placeholder="Note rapide..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="flex-1" />
              <Button size="md" disabled={!noteInput.trim()} onClick={() => { addNote(id, noteInput.trim()); setNoteInput(""); }}>Ajouter</Button>
            </div>
          </Card>
        </div>

        {/* Right — Status & Reminders */}
        <div className="space-y-4">
          {/* Status pipeline */}
          <Card>
            <h2 className="text-base font-semibold text-white mb-3">Statut</h2>
            <div className="space-y-1.5">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(id, s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    contact.status === s
                      ? "bg-[#85adff]/15 text-[#85adff]"
                      : "text-[#adaaab] hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${contact.status === s ? "bg-[#85adff]" : "bg-[#484849]"}`} />
                    {STATUS_LABELS[s]}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Reminders */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Rappels</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReminder(true)}>+</Button>
            </div>
            {contact.reminders.length === 0 ? (
              <p className="text-xs text-[#484849]">Aucun rappel</p>
            ) : (
              <div className="space-y-2">
                {contact.reminders.map((r) => (
                  <div key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 ${r.done ? "opacity-40" : ""}`}>
                    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{r.label}</p>
                      <p className="text-[10px] text-[#484849]">{formatDate(r.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Reminder modal */}
      <Modal open={showReminder} onClose={() => setShowReminder(false)} title="Nouveau rappel">
        <div className="space-y-4">
          <Input label="Label" placeholder="Ex: Relancer dans 48h" value={reminderLabel} onChange={(e) => setReminderLabel(e.target.value)} />
          <Input label="Date" type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
          <Button disabled={!reminderLabel.trim() || !reminderDate} onClick={() => { addReminder(id, reminderLabel, reminderDate); setReminderLabel(""); setReminderDate(""); setShowReminder(false); }}>Ajouter</Button>
        </div>
      </Modal>
    </div>
  );
}
