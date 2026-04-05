"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessions";
import { useWingRequests } from "@/hooks/useWingRequests";
import { inviteWingsToSession } from "@/lib/db";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";
import type { PublicProfile } from "@/types";

export default function NewSessionPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { add } = useSessions();
  const { wingProfiles } = useWingRequests();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [selectedWingIds, setSelectedWingIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number>(48.8566);
  const [lng, setLng] = useState<number>(2.3522);
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(0);

  const toggleWing = (wingUserId: string) => {
    setSelectedWingIds((prev) =>
      prev.includes(wingUserId) ? prev.filter((id) => id !== wingUserId) : [...prev, wingUserId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const goals = goalsText.split("\n").filter(Boolean).map((text) => ({ text: text.trim(), done: false }));
    const wingNames = selectedWingIds.map((id) => {
      const p = wingProfiles.find((wp: PublicProfile) => wp.userId === id);
      return p?.username || p?.firstName || id;
    });
    const session = add({
      title,
      date: new Date(date).toISOString(),
      location,
      address,
      lat,
      lng,
      wings: wingNames,
      notes,
      goals,
      interactionIds: [],
      isPublic,
      maxParticipants,
    });

    // Send invites to selected wings
    if (selectedWingIds.length > 0) {
      await inviteWingsToSession(session.id, userId, selectedWingIds);
    }

    router.push("/sessions");
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[#a09bb2] hover:text-white transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Nouvelle session</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Titre" placeholder="Ex: Session Centre-ville" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <p className="text-xs font-medium text-[#a09bb2] mb-2">Inviter des Wings</p>
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
                        ? "bg-[#c084fc]/15 text-[#c084fc] ring-1 ring-[#c084fc]/30"
                        : "bg-[#1a1626] text-[#a09bb2] hover:bg-[#231e30]"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${selected ? "bg-[#c084fc]/20 text-[#c084fc]" : "bg-[#14111c] text-[#6b6580]"}`}>
                      {wp.firstName?.[0]?.toUpperCase() || wp.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span>@{wp.username || wp.firstName || "—"}</span>
                    {selected && (
                      <svg className="w-3.5 h-3.5 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#6b6580]">Aucun wing pour le moment. Ajoutez des wings depuis l&apos;onglet Wings.</p>
          )}
          {selectedWingIds.length > 0 && (
            <p className="text-[10px] text-[#6b6580] mt-2">{selectedWingIds.length} wing{selectedWingIds.length > 1 ? "s" : ""} invite{selectedWingIds.length > 1 ? "s" : ""} — ils recevront une notification</p>
          )}
        </div>

        <TextArea label="Objectifs (un par ligne)" placeholder={"Faire 5 approches\nTester une approche directe\nRester plus de 3 min"} rows={3} value={goalsText} onChange={(e) => setGoalsText(e.target.value)} />
        <TextArea label="Notes" placeholder="Notes de session..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {/* Public session toggle */}
        <div className="p-4 rounded-xl bg-[#14111c] border border-[rgba(192,132,252,0.08)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Session publique</p>
              <p className="text-[10px] text-[#6b6580]">Visible dans le feed, d&apos;autres joueurs peuvent rejoindre</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-[#c084fc]" : "bg-[#3d3650]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {isPublic && (
            <Input label="Places max (0 = illimite)" type="number" min={0} value={String(maxParticipants)} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="lg">Creer la session</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
