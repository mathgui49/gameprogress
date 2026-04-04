"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Interaction, ApproachType, ResultType, DurationType, ObjectionType, ContactMethod } from "@/types";
import { OBJECTION_LABELS } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VoiceInput } from "@/components/ui/VoiceInput";

interface InteractionFormProps {
  initial?: Interaction | null;
  defaultLocation?: string;
  defaultSessionId?: string;
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
const scoreOptions = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}/10` }));
const objectionOptions = [
  { value: "", label: "Aucune" },
  ...Object.entries(OBJECTION_LABELS).map(([value, label]) => ({ value, label })),
];
const contactMethodOptions = [
  { value: "", label: "Pas de contact" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Telephone" },
  { value: "other", label: "Autre" },
];

export function InteractionForm({ initial, defaultLocation, defaultSessionId, onSubmit }: InteractionFormProps) {
  const router = useRouter();
  const [quickMode, setQuickMode] = useState(false);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [memorableElement, setMemorableElement] = useState(initial?.memorableElement ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [location, setLocation] = useState(initial?.location ?? defaultLocation ?? "");
  const [type, setType] = useState<ApproachType>(initial?.type ?? "direct");
  const [result, setResult] = useState<ResultType>(initial?.result ?? "neutral");
  const [duration, setDuration] = useState<DurationType>(initial?.duration ?? "medium");
  const [feelingScore, setFeelingScore] = useState(initial?.feelingScore ?? 7);
  const [womanScore, setWomanScore] = useState(initial?.womanScore ?? 7);
  const [confidenceScore, setConfidenceScore] = useState(initial?.confidenceScore ?? 5);
  const [objection, setObjection] = useState<ObjectionType | null>(initial?.objection ?? null);
  const [objectionCustom, setObjectionCustom] = useState(initial?.objectionCustom ?? "");
  const [discussionTopics, setDiscussionTopics] = useState(initial?.discussionTopics ?? "");
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [contactMethod, setContactMethod] = useState<ContactMethod | null>(initial?.contactMethod ?? null);
  const [contactValue, setContactValue] = useState(initial?.contactValue ?? "");
  const [date, setDate] = useState(initial?.date ? new Date(initial.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName, memorableElement, note, location, type, result, duration,
      feelingScore, womanScore, confidenceScore,
      objection, objectionCustom,
      discussionTopics, feedback,
      contactMethod, contactValue,
      sessionId: initial?.sessionId ?? defaultSessionId ?? "",
      date: new Date(date).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-[#100e17] rounded-xl w-fit">
        <button type="button" onClick={() => setQuickMode(false)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${!quickMode ? "bg-[#c084fc]/15 text-[#c084fc]" : "text-[#6b6580] hover:text-[#a09bb2]"}`}>
          Complet
        </button>
        <button type="button" onClick={() => setQuickMode(true)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${quickMode ? "bg-[#c084fc]/15 text-[#c084fc]" : "text-[#6b6580] hover:text-[#a09bb2]"}`}>
          Rapide
        </button>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prenom" id="fn" placeholder="Optionnel" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Element marquant" id="memo" placeholder="Pour te souvenir d'elle" value={memorableElement} onChange={(e) => setMemorableElement(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Lieu" id="loc" placeholder="Ex: Cafe, Rue..." value={location} onChange={(e) => setLocation(e.target.value)} />
        {!quickMode && <Input label="Date et heure" id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
      </div>

      {/* Core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Type" id="type" options={typeOptions} value={type} onChange={(e) => setType(e.target.value as ApproachType)} />
        <Select label="Resultat" id="result" options={resultOptions} value={result} onChange={(e) => setResult(e.target.value as ResultType)} />
        <Select label="Duree" id="dur" options={durationOptions} value={duration} onChange={(e) => setDuration(e.target.value as DurationType)} />
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Ressenti interaction" id="feel" options={scoreOptions} value={String(feelingScore)} onChange={(e) => setFeelingScore(Number(e.target.value))} />
        <Select label="Note sur la fille" id="ws" options={scoreOptions} value={String(womanScore)} onChange={(e) => setWomanScore(Number(e.target.value))} />
        <Select label="Confiance de la revoir" id="cs" options={scoreOptions} value={String(confidenceScore)} onChange={(e) => setConfidenceScore(Number(e.target.value))} />
      </div>

      {/* Objection */}
      {!quickMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Objection recue" id="obj" options={objectionOptions} value={objection ?? ""} onChange={(e) => setObjection(e.target.value ? e.target.value as ObjectionType : null)} />
          {objection === "other" && (
            <Input label="Objection personnalisee" id="objc" placeholder="Preciser..." value={objectionCustom} onChange={(e) => setObjectionCustom(e.target.value)} />
          )}
        </div>
      )}

      {/* Contact info (shown when close) */}
      {result === "close" && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Contact obtenu</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Type de contact" id="cm" options={contactMethodOptions} value={contactMethod ?? ""} onChange={(e) => setContactMethod(e.target.value ? e.target.value as ContactMethod : null)} />
            {contactMethod && (
              <Input label="Valeur" id="cv" placeholder={contactMethod === "instagram" ? "@pseudo" : contactMethod === "phone" ? "06..." : "Preciser"} value={contactValue} onChange={(e) => setContactValue(e.target.value)} />
            )}
          </div>
        </div>
      )}

      {/* Discussion topics */}
      {!quickMode && (
        <TextArea label="Sujets de discussion" id="topics" placeholder="Elements sur lesquels rebondir par message..." rows={2} value={discussionTopics} onChange={(e) => setDiscussionTopics(e.target.value)} />
      )}

      {/* Notes & Feedback */}
      {!quickMode ? (
        <>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><TextArea label="Notes / Commentaire" id="note" placeholder="Description, impressions..." rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <VoiceInput onResult={(t) => setNote((prev) => prev ? `${prev} ${t}` : t)} />
            </div>
          </div>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><TextArea label="Feedback personnel" id="fb" placeholder="Qu'est-ce que tu aurais pu faire mieux ? Ce qui a bien marche..." rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
              <VoiceInput onResult={(t) => setFeedback((prev) => prev ? `${prev} ${t}` : t)} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input label="Note rapide" id="qn" placeholder="Note rapide..." value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <VoiceInput onResult={(t) => setNote((prev) => prev ? `${prev} ${t}` : t)} />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg">{initial ? "Modifier" : "Ajouter"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
