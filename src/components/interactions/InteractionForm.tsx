"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Interaction, ApproachType, ResultType, DurationType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface InteractionFormProps {
  initial?: Interaction | null;
  onSubmit: (data: Omit<Interaction, "id" | "createdAt">) => void;
}

const typeOptions = [
  { value: "direct", label: "Direct" },
  { value: "indirect", label: "Indirect" },
  { value: "situational", label: "Situationnel" },
];
const resultOptions = [
  { value: "close", label: "Close" },
  { value: "neutral", label: "Neutre" },
  { value: "rejection", label: "Rejet" },
];
const durationOptions = [
  { value: "short", label: "Court (<2 min)" },
  { value: "medium", label: "Moyen (2-5 min)" },
  { value: "long", label: "Long (5+ min)" },
];
const feelingOptions = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}/10` }));

export function InteractionForm({ initial, onSubmit }: InteractionFormProps) {
  const router = useRouter();
  const [quickMode, setQuickMode] = useState(false);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [type, setType] = useState<ApproachType>(initial?.type ?? "direct");
  const [result, setResult] = useState<ResultType>(initial?.result ?? "neutral");
  const [duration, setDuration] = useState<DurationType>(initial?.duration ?? "medium");
  const [feelingScore, setFeelingScore] = useState(initial?.feelingScore ?? 7);
  const [date, setDate] = useState(initial?.date ? new Date(initial.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ firstName, note, location, type, result, duration, feelingScore, date: new Date(date).toISOString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-[#131314] rounded-xl w-fit">
        <button type="button" onClick={() => setQuickMode(false)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${!quickMode ? "bg-[#85adff]/15 text-[#85adff]" : "text-[#484849] hover:text-[#adaaab]"}`}>
          Complet
        </button>
        <button type="button" onClick={() => setQuickMode(true)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${quickMode ? "bg-[#85adff]/15 text-[#85adff]" : "text-[#484849] hover:text-[#adaaab]"}`}>
          Rapide
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prenom" id="fn" placeholder="Optionnel" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Lieu" id="loc" placeholder="Ex: Cafe, Rue..." value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      {!quickMode && <Input label="Date et heure" id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Type" id="type" options={typeOptions} value={type} onChange={(e) => setType(e.target.value as ApproachType)} />
        <Select label="Resultat" id="result" options={resultOptions} value={result} onChange={(e) => setResult(e.target.value as ResultType)} />
        <Select label="Duree" id="dur" options={durationOptions} value={duration} onChange={(e) => setDuration(e.target.value as DurationType)} />
      </div>

      <Select label="Ressenti" id="feel" options={feelingOptions} value={String(feelingScore)} onChange={(e) => setFeelingScore(Number(e.target.value))} />

      {!quickMode ? (
        <TextArea label="Notes" id="note" placeholder="Description, sujets, impressions..." rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      ) : (
        <Input label="Note rapide" id="qn" placeholder="Note rapide..." value={note} onChange={(e) => setNote(e.target.value)} />
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg">{initial ? "Modifier" : "Ajouter"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
