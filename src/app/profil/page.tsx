"use client";

import { useState } from "react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { PrivacySettings, PublicProfile } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";
import { uploadImageAction } from "@/actions/db";

type PrivacyOption = "off" | "wings" | "public";

const PRIVACY_GROUPS: { label: string; hint: string; publicKey: keyof PrivacySettings; wingsKey?: keyof PrivacySettings; noWings?: boolean }[] = [
  { label: "Classement", hint: "Apparaître dans le classement", publicKey: "showInLeaderboardPublic", wingsKey: "showInLeaderboardWings" },
  { label: "Statistiques", hint: "Partager tes stats de progression", publicKey: "shareStatsPublic", wingsKey: "shareStatsWings" },
  { label: "Apparaître dans Découvrir", hint: "Les autres utilisateurs peuvent te trouver", publicKey: "showInDiscover", noWings: true },
];

export default function ProfilPage() {
  const { profile, loaded, saving, save } = usePublicProfile();

  // Local draft state for the form
  const [draft, setDraft] = useState<Partial<Omit<PublicProfile, "userId" | "createdAt">> | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize draft from profile when loaded
  const d = draft ?? {
    username: profile?.username ?? "",
    firstName: profile?.firstName ?? "",
    birthDate: profile?.birthDate ?? null,
    location: profile?.location ?? "",
    lat: profile?.lat ?? null,
    lng: profile?.lng ?? null,
    bio: profile?.bio ?? "",
  };

  const updateDraft = (updates: Partial<typeof d>) => {
    setDraft({ ...d, ...updates });
    setSaved(false);
  };

  const handleSave = () => {
    save(d, true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isDirty = draft !== null;

  const privacy = profile?.privacy ?? DEFAULT_PRIVACY;

  const getGroupValue = (g: typeof PRIVACY_GROUPS[number]): PrivacyOption => {
    if (privacy[g.publicKey]) return "public";
    if (g.wingsKey && privacy[g.wingsKey]) return "wings";
    return "off";
  };

  const setGroupValue = (g: typeof PRIVACY_GROUPS[number], v: PrivacyOption) => {
    const updates: Partial<PrivacySettings> = { [g.publicKey]: v === "public" };
    if (g.wingsKey) updates[g.wingsKey] = v === "wings" || v === "public";
    save({ privacy: { ...privacy, ...updates } }, true);
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const hasLocation = !!((d.location as string)?.trim());

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] to-[#818cf8] bg-clip-text text-transparent animate-gradient-text">Profil</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Configure ton profil public visible par les autres gamers</p>
      </div>

      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card shadow-lg border border-emerald-400/20">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs font-medium text-emerald-400">Profil sauvegardé</span>
          </div>
        </div>
      )}

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Profil public</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-4">Les informations renseignées ci-dessous seront visibles par les autres utilisateurs. Laisse un champ vide pour ne pas l&apos;afficher.</p>
        <div className="space-y-4">
          {/* Profile photo */}
          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Photo de profil</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-bright)] flex items-center justify-center overflow-hidden border border-[var(--border)]">
                {profile?.profilePhoto ? (
                  <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-[var(--primary)]">{(d.firstName as string)?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5_000_000) { alert("Photo trop lourde (max 5 Mo)"); return; }
                      // Compress to 256x256 JPEG before upload
                      const img = new window.Image();
                      img.onload = async () => {
                        const canvas = document.createElement("canvas");
                        const size = 256;
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext("2d")!;
                        const min = Math.min(img.width, img.height);
                        const sx = (img.width - min) / 2;
                        const sy = (img.height - min) / 2;
                        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                        const compressed = canvas.toDataURL("image/jpeg", 0.8);
                        const url = await uploadImageAction(compressed, "profiles");
                        if (url) { save({ profilePhoto: url }, true); }
                      };
                      img.src = URL.createObjectURL(file);
                    }}
                  />
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors cursor-pointer">
                    Choisir une photo
                  </span>
                </label>
                {profile?.profilePhoto && (
                  <button onClick={() => { save({ profilePhoto: null }, true); }} className="text-[10px] text-[var(--error)] hover:underline text-left">
                    Retirer la photo
                  </button>
                )}
                <p className="text-[10px] text-[var(--outline)]">Max 5 Mo. Seule cette photo sera visible par les autres.</p>
              </div>
            </div>
          </div>

          <Input label="Nom d'utilisateur" id="pu" placeholder="ex: mathieu_75" value={(d.username as string) ?? ""} onChange={(e) => updateDraft({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
          <Input label="Prénom" id="pfn" placeholder="Ton prénom" value={(d.firstName as string) ?? ""} onChange={(e) => updateDraft({ firstName: e.target.value })} />
          <Input label="Date de naissance" id="pbd" type="date" value={(d.birthDate as string) ?? ""} onChange={(e) => updateDraft({ birthDate: e.target.value || null })} />
          <MapPicker
            label="Ville"
            lat={(d.lat as number) ?? 48.8566}
            lng={(d.lng as number) ?? 2.3522}
            address={(d.location as string) ?? ""}
            onAddressChange={(loc) => updateDraft({ location: loc })}
            onCoordsChange={(newLat, newLng) => updateDraft({ lat: newLat, lng: newLng })}
            hideMap={!hasLocation}
          />
          <TextArea label="Bio" id="pbio" placeholder="Quelques mots sur toi et ton game..." rows={2} value={(d.bio as string) ?? ""} onChange={(e) => updateDraft({ bio: e.target.value })} />

          <Button onClick={handleSave} disabled={saving || (!isDirty && !saved)} className="w-full">
            {saving ? "Enregistrement..." : saved ? "Sauvegardé !" : "Enregistrer"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Confidentialité</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-2">Choisis ce que tu partages et avec qui.</p>
        <p className="text-[10px] text-[var(--outline)] mb-5">Tes stats entrent toujours dans le calcul anonyme de la moyenne communautaire, même en mode privé.</p>
        <div className="space-y-5">
          {PRIVACY_GROUPS.map((g) => {
            const current = getGroupValue(g);
            const options: { value: PrivacyOption; label: string; activeClass: string }[] = [
              { value: "off", label: "Privé", activeClass: "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]" },
              ...(!g.noWings && g.wingsKey ? [{ value: "wings" as PrivacyOption, label: "Wings", activeClass: "bg-[var(--tertiary)]/20 text-[var(--tertiary)]" }] : []),
              { value: "public", label: "Public", activeClass: "bg-emerald-400/20 text-emerald-400" },
            ];
            return (
              <div key={g.publicKey}>
                <p className="text-sm text-[var(--on-surface-variant)] mb-1">{g.label}</p>
                <p className="text-[10px] text-[var(--outline)] mb-2">{g.hint}</p>
                <div className="flex gap-2">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setGroupValue(g, o.value)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        current === o.value ? o.activeClass : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
