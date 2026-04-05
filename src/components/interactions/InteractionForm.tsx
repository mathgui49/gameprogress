"use client";

import { useState, useRef, useCallback } from "react";
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

const SUGGESTED_TAGS = ["daygame", "nightgame", "groupe", "solo", "street", "cafe", "bar", "transport", "parc", "soiree"];

// ─── Swipe-friendly score slider ──────────────────────
function ScoreSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const score = Math.round(pct * 9) + 1;
    onChange(score);
  }, [onChange]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-[var(--on-surface-variant)]">{label}</label>
        <span className={`text-sm font-bold ${color}`}>{value}/10</span>
      </div>
      <div
        ref={trackRef}
        className="flex items-center gap-1 touch-none select-none"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); handlePointerMove(e); }}
        onPointerMove={handlePointerMove}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-lg transition-all text-xs font-medium pointer-events-none ${
              n <= value
                ? `${color.includes("f472b6") ? "bg-[#f472b6]/20 text-[var(--secondary)]" : "bg-[var(--primary)]/20 text-[var(--primary)]"}`
                : "bg-[var(--surface-high)] text-[var(--outline)]"
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
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [contextPhoto, setContextPhoto] = useState<string | null>(initial?.contextPhoto ?? null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleResultChange = (newResult: ResultType | "") => {
    setResult(newResult);
    if (newResult === "close" || newResult === "") {
      setObjection(null);
      setObjectionCustom("");
    }
  };

  const objectionOptions = result === "neutral" ? NEUTRAL_OBJECTIONS : REJECTION_OBJECTIONS;

  // ─── Geolocation ────────────────────────────────────
  const handleGeolocate = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`);
          const data = await res.json();
          const addr = data.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.municipality || "";
          const road = addr?.road || "";
          setLocation(road ? `${road}, ${city}` : city);
        } catch {
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ─── Photo ──────────────────────────────────────────
  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setContextPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ─── Tags ───────────────────────────────────────────
  const addTag = (tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüç_-]/g, "").trim();
    if (clean && !tags.includes(clean)) setTags([...tags, clean]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

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
      tags,
      contextPhoto,
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

      {/* Location with geoloc button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1.5">Lieu</label>
          <div className="flex gap-2">
            <input
              placeholder="Ex: Cafe, Rue..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 h-10 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="h-10 w-10 shrink-0 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors disabled:opacity-50"
              title="Utiliser ma position"
            >
              {geoLoading ? (
                <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
              )}
            </button>
          </div>
        </div>
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

      {/* Scores - swipe-friendly */}
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

      {/* Tags */}
      <div>
        <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Tags</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              #{t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <input
            placeholder="Ajouter un tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
            className="flex-1 h-8 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-3 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          />
          <button type="button" onClick={() => addTag(tagInput)} className="text-xs text-[var(--primary)] hover:underline" disabled={!tagInput.trim()}>+</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
            <button key={t} type="button" onClick={() => addTag(t)} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-high)] text-[var(--outline)] hover:bg-[var(--surface-bright)] hover:text-[var(--primary)] transition-colors">
              #{t}
            </button>
          ))}
        </div>
      </div>

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

      {/* Context photo */}
      <div>
        <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Photo de contexte</p>
        {contextPhoto ? (
          <div className="relative inline-block">
            <img src={contextPhoto} alt="Contexte" className="w-32 h-32 object-cover rounded-xl" />
            <button
              type="button"
              onClick={() => setContextPhoto(null)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--outline)] hover:text-red-400"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePhotoUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-xs text-[var(--outline)] hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
            Ajouter une photo
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg">{initial ? "Modifier" : "Ajouter"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
