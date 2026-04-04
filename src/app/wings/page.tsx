"use client";

import { useState } from "react";
import { useWings } from "@/hooks/useWings";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default function WingsPage() {
  const { wings, loaded, add, update, remove } = useWings();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const openEdit = (wing: typeof wings[0]) => {
    setEditingId(wing.id);
    setName(wing.name);
    setNotes(wing.notes);
    setShowNew(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingId) {
      update(editingId, { name: name.trim(), notes: notes.trim() });
    } else {
      add(name.trim(), notes.trim());
    }
    setName("");
    setNotes("");
    setEditingId(null);
    setShowNew(false);
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Wings</h1>
          <p className="text-sm text-[#adaaab]">{wings.length} wing{wings.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditingId(null); setName(""); setNotes(""); setShowNew(true); }}>+ Wing</Button>
      </div>

      {wings.length === 0 ? (
        <EmptyState icon="🤝" title="Aucun wing" description="Ajoute tes partenaires de session pour les retrouver facilement." action={<Button onClick={() => setShowNew(true)}>Ajouter un wing</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wings.map((wing, idx) => (
            <div key={wing.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <Card hover className="!p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#85adff]/20 to-[#ac8aff]/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#85adff]">{wing.name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{wing.name}</p>
                      <p className="text-[10px] text-[#484849]">{wing.sessionCount} session{wing.sessionCount > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(wing)} className="text-[#484849] hover:text-[#85adff] transition-colors text-xs">✎</button>
                    <button onClick={() => remove(wing.id)} className="text-[#484849] hover:text-[#ff6e84] transition-colors text-xs">✕</button>
                  </div>
                </div>
                {wing.notes && <p className="text-xs text-[#adaaab] mt-2 line-clamp-2">{wing.notes}</p>}
                <p className="text-[10px] text-[#484849] mt-2">Ajoute le {formatDate(wing.createdAt)}</p>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setEditingId(null); }} title={editingId ? "Modifier le wing" : "Nouveau wing"}>
        <div className="space-y-4">
          <Input label="Nom" placeholder="Prenom ou pseudo" value={name} onChange={(e) => setName(e.target.value)} />
          <TextArea label="Notes (optionnel)" placeholder="Style de game, points forts..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button disabled={!name.trim()} onClick={handleSubmit}>
            {editingId ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
