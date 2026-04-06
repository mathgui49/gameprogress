"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessions";
import { useWingRequests } from "@/hooks/useWingRequests";
import { inviteWingsToSessionAction } from "@/actions/db";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";
import type { PublicProfile } from "@/types";
import { useToast } from "@/hooks/useToast";

export default function NewSessionPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { add } = useSessions();
  const { wingProfiles } = useWingRequests();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [selectedWingIds, setSelectedWingIds] = useState<string[]>([]);
  const [externalWings, setExternalWings] = useState<string[]>([]);
  const [newExternalWing, setNewExternalWing] = useState("");
  const [notes, setNotes] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number>(48.8566);
  const [lng, setLng] = useState<number>(2.3522);
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(0);

  const toggleWing = (wingUserId: string) => {
    setSelectedWingIds((prev) =>
      prev.includes(wingUserId) ? prev.filter((id) => id !== wingUserId) : [...prev, wingUserId]
    );
  };

  const addExternalWing = () => {
    const name = newExternalWing.trim();
    if (name && !externalWings.includes(name)) {
      setExternalWings((prev) => [...prev, name]);
      setNewExternalWing("");
    }
  };

  const removeExternalWing = (name: string) => {
    setExternalWings((prev) => prev.filter((w) => w !== name));
  };

  // Build default title from location if no title is provided
  const resolveTitle = () => {
    if (title.trim()) return title.trim();
    if (location.trim()) return `Session ${location.trim()}`;
    if (address.trim()) {
      const parts = address.split(",").map((p) => p.trim());
      return `Session ${parts[0]}`;
    }
    return "Session";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const goals = goalsText.split("\n").filter(Boolean).map((text) => ({ text: text.trim(), done: false }));
    const appWingNames = selectedWingIds.map((id) => {
      const p = wingProfiles.find((wp: PublicProfile) => wp.userId === id);
      return p?.username || p?.firstName || id;
    });
    const allWingNames = [...appWingNames, ...externalWings];
    const session = await add({
      title: resolveTitle(),
      date: new Date(date).toISOString(),
      location,
      address,
      lat,
      lng,
      wings: allWingNames,
      notes,
      goals,
      interactionIds: [],
      isPublic,
      maxParticipants,
    });

    // Send invites to selected wings (app users only)
    if (selectedWingIds.length > 0) {
      await inviteWingsToSessionAction(session.id, selectedWingIds);
    }

    toast.show("Session créée !");
    router.push("/sessions");
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <h1 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight mb-1">Nouvelle session</h1>
      <p className="text-sm text-[var(--on-surface-variant)] mb-6">Planifie une sortie et invite tes wings</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Titre (optionnel)" placeholder="Ex: Session Centre-ville (auto si vide)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Lieu (ville / quartier)" placeholder="Ex: Paris 1er" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <MapPicker
          label="Point de rassemblement"
          lat={lat}
          lng={lng}
          address={address}
          onAddressChange={setAddress}
          onCoordsChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
        />

        {/* Wings invite selector */}
        <div>
          <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Inviter des Wings</p>
          {wingProfiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {wingProfiles.map((wp: PublicProfile) => {
                const selected = selectedWingIds.includes(wp.userId);
                return (
                  <button
                    key={wp.userId}
                    type="button"
                    onClick={() => toggleWing(wp.userId)}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all ${
                      selected
                        ? "bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                        : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${selected ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--surface)] text-[var(--outline)]"}`}>
                      {wp.firstName?.[0]?.toUpperCase() || wp.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span>@{wp.username || wp.firstName || "—"}</span>
                    {selected && (
                      <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--outline)]">Aucun wing pour le moment. Ajoutez des wings depuis l&apos;onglet Wings.</p>
          )}
          {selectedWingIds.length > 0 && (
            <p className="text-[10px] text-[var(--outline)] mt-2">{selectedWingIds.length} wing{selectedWingIds.length > 1 ? "s" : ""} invite{selectedWingIds.length > 1 ? "s" : ""} — ils recevront une notification</p>
          )}
        </div>

        {/* External wings (not on the app) */}
        <div>
          <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Wings externes (pas sur GameProgress)</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newExternalWing}
              onChange={(e) => setNewExternalWing(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExternalWing(); } }}
              placeholder="Nom ou pseudo..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--primary)]/30 transition-colors"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addExternalWing} disabled={!newExternalWing.trim()}>Ajouter</Button>
          </div>
          {externalWings.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {externalWings.map((name) => (
                <span key={name} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--surface-high)] text-[var(--on-surface-variant)]">
                  {name}
                  <button type="button" onClick={() => removeExternalWing(name)} className="text-[var(--outline)] hover:text-[#fb7185] transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <TextArea label="Description et objectifs de session (un par ligne)" placeholder={"Faire 5 approches\nTester une approche directe\nRester plus de 3 min"} rows={3} value={goalsText} onChange={(e) => setGoalsText(e.target.value)} />
        <TextArea label="Notes" placeholder="Notes de session..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {/* Public session toggle */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--on-surface)] font-medium">Session publique</p>
              <p className="text-[10px] text-[var(--outline)]">Visible dans le feed, d&apos;autres gamers peuvent rejoindre</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {isPublic && (
            <Input label="Places max (0 = illimite)" type="number" min={0} value={String(maxParticipants)} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "Création..." : "Créer la session"}</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
