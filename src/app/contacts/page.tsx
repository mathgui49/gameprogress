"use client";

import { useState } from "react";
import { useContacts } from "@/hooks/useContacts";
import type { ContactStatus, ContactMethod } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { IconUsers } from "@/components/ui/Icons";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

const PIPELINE_ORDER: ContactStatus[] = ["new", "contacted", "replied", "date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced", "archived"];

export default function ContactsPage() {
  const { contacts, loaded, add } = useContacts();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMethod, setNewMethod] = useState<ContactMethod>("instagram");
  const [newValue, setNewValue] = useState("");

  if (!loaded) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;
  }

  if (contacts.length === 0) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] to-[#34d399] bg-clip-text text-transparent">Pipeline</span></h1>
        <EmptyState icon={<IconUsers size={32} className="text-[var(--primary)]" />} title="Aucun contact" description="Les contacts apparaissent ici quand tu obtiens un close lors d'une interaction." />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] to-[#34d399] bg-clip-text text-transparent">Pipeline</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Contact</Button>
      </div>

      {/* Kanban board — vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col lg:flex-row lg:gap-4 lg:overflow-x-auto lg:pb-4 lg:no-scrollbar gap-6">
        {PIPELINE_ORDER.map((status) => {
          const items = contacts.filter((c) => c.status === status);
          if (items.length === 0) return null;
          return (
            <div key={status} className="lg:min-w-[280px] lg:flex-shrink-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                <span className="text-xs text-[var(--outline)]">{items.length}</span>
              </div>

              {/* Cards — horizontal scroll on mobile, vertical on desktop */}
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 no-scrollbar">
                {items.map((contact) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`} className="min-w-[240px] lg:min-w-0">
                    <Card hover className="!p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-[var(--primary)]">{contact.firstName[0]?.toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--on-surface)]">{contact.firstName}</p>
                            <p className="text-[10px] text-[var(--outline)]">{contact.method === "instagram" ? contact.methodValue : "Téléphone"}</p>
                          </div>
                        </div>
                      </div>
                      {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">{tag}</span>
                          ))}
                        </div>
                      )}
                      {contact.reminders.filter((r) => !r.done).length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {contact.reminders.filter((r) => !r.done).length} rappel(s)
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--outline)] mt-2">{formatRelative(contact.lastInteractionDate)}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* New contact modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau contact">
        <div className="space-y-4">
          <Input label="Prénom" placeholder="Prénom ou identifiant" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select label="Type de contact" options={[{ value: "instagram", label: "Instagram" }, { value: "phone", label: "Téléphone" }, { value: "other", label: "Autre" }]} value={newMethod} onChange={(e) => setNewMethod(e.target.value as ContactMethod)} />
          <Input label="Valeur" placeholder={newMethod === "instagram" ? "@pseudo" : "06..."} value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Button disabled={!newName.trim()} onClick={() => {
            add({ firstName: newName.trim(), sourceInteractionId: "", method: newMethod, methodValue: newValue, status: "new", tags: [], notes: "" });
            setNewName(""); setNewValue(""); setShowNew(false);
          }}>Créer</Button>
        </div>
      </Modal>
    </div>
  );
}
