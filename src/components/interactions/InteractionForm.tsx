"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Interaction, ApproachType, ResultType, DurationType, ObjectionType, ContactMethod } from "@/types";
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
  { value: "", label: "—" },
  { value: "direct", label: "Direct" },
  { value: "indirect", label: "Indirect" },
  { value: "situational", label: "Situationnel" },
];
const resultOptions = [
  { value: "", label: "—" },
  { value: "close", label: "Close" },
  { value: "neutral", label: "Neutre" },
  { value: "rejection", label: "Rejet" },
];
const durationOptions = [
  { value: "", label: "—" },
  { value: "short", label: "Court (<2 min)" },
  { value: "medium", label: "Moyen (2-5 min)" },
  { value: "long", label: "Long (5+ min)" },
];

const NEUTRAL_OBJECTIONS: { value: ObjectionType; label: string }[] = [
  { value: "in_relationship", label: "En couple" },
  { value: "other", label: "Autre" },
];
const REJECTION_OBJECTIONS: { value: ObjectionType; label: string }[] = [
  { value: "not_interested", label: "Pas intéressée" },
  { value: "busy", label: "Pressée / pas le temps" },
  { value: "too_old", label: "Trop vieux / trop jeune" },
  { value: "other", label: "Autre" },
];

const contactMethodOptionsClose = [
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Téléphone" },
  { value: "other", label: "Autre" },
];

function ScoreSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-[var(--on-surface-variant)]">{label}</label>
        <span className={`text-sm font-bold ${color}`}>{value}/10</span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-lg transition-all text-xs font-medium ${
              n <= value
                ? `${color.includes("f472b6") ? "bg-[#f472b6]/20 text-[var(--secondary)]" : "bg-[var(--primary)]/20 text-[var(--primary)]"}`
                : "bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InteractionForm({ initial, defaultLocation, defaultSessionId, onSubmit }: InteractionFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [memorableElement, setMemorableElement] = useState(initial?.memorableElement ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [location, setLocation] = useState(initial?.location ?? defaultLocation ?? "");
  const [type, setType] = useState<ApproachType | "">(initial?.type ?? "");
  const [result, setResult] = useState<ResultType | "">(initial?.result ?? "");
  const [duration, setDuration] = useState<DurationType | "">(initial?.duration ?? "");
  const [feelingScore, setFeelingScore] = useState(initial?.feelingScore ?? 5);
  const [womanScore, setWomanScore] = useState(initial?.womanScore ?? 5);
  const [objection, setObjection] = useState<ObjectionType | null>(initial?.objection ?? null);
  const [objectionCustom, setObjectionCustom] = useState(initial?.objectionCustom ?? "");
  const [discussionTopics, setDiscussionTopics] = useState(initial?.discussionTopics ?? "");
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [contactMethod, setContactMethod] = useState<ContactMethod | null>(initial?.contactMethod ?? null);
  const [contactValue, setContactValue] = useState(initial?.contactValue ?? "");
  const [date, setDate] = useState(initial?.date ? new Date(initial.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));

  // Reset objection when result changes
  const handleResultChange = (newResult: ResultType | "") => {
    setResult(newResult);
    if (newResult === "close" || newResult === "") {
      setObjection(null);
      setObjectionCustom("");
    }
  };

  const objectionOptions = result === "neutral" ? NEUTRAL_OBJECTIONS : REJECTION_OBJECTIONS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName, memorableElement, note, location,
      type: type || "direct",
      result: result || "neutral",
      duration: duration || "medium",
      feelingScore,
      womanScore,
      confidenceScore: 0,
      objection, objectionCustom,
      discussionTopics, feedback,
      contactMethod, contactValue,
      sessionId: initial?.sessionId ?? defaultSessionId ?? "",
      date: new Date(date).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prenom" id="fn" placeholder="Optionnel" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Element marquant" id="memo" placeholder="Pour te souvenir d'elle" value={memorableElement} onChange={(e) => setMemorableElement(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Lieu" id="loc" placeholder="Ex: Cafe, Rue..." value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input label="Date et heure" id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Core fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Type" id="type" options={typeOptions} value={type} onChange={(e) => setType(e.target.value as ApproachType)} />
        <Select label="Resultat" id="result" options={resultOptions} value={result} onChange={(e) => handleResultChange(e.target.value as ResultType | "")} />
        <Select label="Duree" id="dur" options={durationOptions} value={duration} onChange={(e) => setDuration(e.target.value as DurationType)} />
      </div>

      {/* Contact info (shown when close) */}
      {result === "close" && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Contact obtenu</p>
          <div className="flex flex-wrap gap-2">
            {contactMethodOptionsClose.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setContactMethod(contactMethod === o.value as ContactMethod ? null : o.value as ContactMethod)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  contactMethod === o.value ? "bg-emerald-400/20 text-emerald-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {contactMethod && (
            <Input label="Valeur" id="cv" placeholder={contactMethod === "instagram" ? "@pseudo" : contactMethod === "phone" ? "06..." : "Préciser"} value={contactValue} onChange={(e) => setContactValue(e.target.value)} />
          )}
        </div>
      )}

      {/* Scores - interactive buttons */}
      <ScoreSlider label="Ressenti de l'interaction" value={feelingScore} onChange={setFeelingScore} color="text-[var(--primary)]" />
      <ScoreSlider label="Note sur la fille" value={womanScore} onChange={setWomanScore} color="text-[var(--secondary)]" />

      {/* Objection — only for neutral/rejection */}
      {(result === "neutral" || result === "rejection") && (
        <div>
          <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Objection recue</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setObjection(null); setObjectionCustom(""); }}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                !objection ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
              }`}
            >
              Aucune
            </button>
            {objectionOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setObjection(o.value)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  objection === o.value ? "bg-[#fb7185]/20 text-[#fb7185]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {objection === "other" && (
            <Input placeholder="Préciser l'objection..." value={objectionCustom} onChange={(e) => setObjectionCustom(e.target.value)} className="mt-2" />
          )}
        </div>
      )}

      {/* Discussion topics */}
      <TextArea label="Sujets de discussion" id="topics" placeholder="Elements sur lesquels rebondir par message..." rows={2} value={discussionTopics} onChange={(e) => setDiscussionTopics(e.target.value)} />

      {/* Notes & Feedback */}
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

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg">{initial ? "Modifier" : "Ajouter"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
