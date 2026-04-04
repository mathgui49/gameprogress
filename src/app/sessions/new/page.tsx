"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessions";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";

export default function NewSessionPage() {
  const router = useRouter();
  const { add } = useSessions();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [wings, setWings] = useState("");
  const [notes, setNotes] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goals = goalsText.split("\n").filter(Boolean).map((text) => ({ text: text.trim(), done: false }));
    const wingsList = wings.split(",").map((w) => w.trim()).filter(Boolean);
    add({ title, date: new Date(date).toISOString(), location, wings: wingsList, notes, goals, interactionIds: [] });
    router.push("/sessions");
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[#adaaab] hover:text-white transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Retour
      </button>
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Nouvelle session</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Titre" placeholder="Ex: Session Centre-ville" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Lieu" placeholder="Ex: Paris 1er" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <Input label="Wings (separes par virgule)" placeholder="Ex: Marc, Alex" value={wings} onChange={(e) => setWings(e.target.value)} />
        <TextArea label="Objectifs (un par ligne)" placeholder="Faire 5 approches&#10;Tester une approche directe&#10;Rester plus de 3 min" rows={3} value={goalsText} onChange={(e) => setGoalsText(e.target.value)} />
        <TextArea label="Notes" placeholder="Notes de session..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="lg">Creer la session</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
