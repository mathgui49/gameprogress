"use client";

import { useState, useRef } from "react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { PrivacySettings } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";

type PrivacyOption = "off" | "wings" | "public";

const PRIVACY_GROUPS: { label: string; hint: string; publicKey: keyof PrivacySettings; wingsKey?: keyof PrivacySettings; noPublic?: boolean }[] = [
  { label: "Age", hint: "Afficher ton age sur ton profil", publicKey: "shareAgePublic", wingsKey: "shareAgeWings" },
  { label: "Classement", hint: "Apparaitre dans le classement", publicKey: "showInLeaderboardPublic", wingsKey: "showInLeaderboardWings" },
  { label: "Statistiques", hint: "Partager tes stats", publicKey: "shareStatsWings", noPublic: true },
  { label: "Rapports", hint: "Partager tes rapports", publicKey: "shareReportsWithWings", noPublic: true },
  { label: "Liste Wings", hint: "Visible dans Decouvrir", publicKey: "showInWingList" },
];

export default function ProfilPage() {
  const { profile, loaded, save } = usePublicProfile();
  const [saved, setSaved] = useState(false);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const privacy = profile?.privacy ?? DEFAULT_PRIVACY;

  const getGroupValue = (g: typeof PRIVACY_GROUPS[number]): PrivacyOption => {
    if (!g.noPublic && privacy[g.publicKey]) return "public";
    if (g.noPublic && privacy[g.publicKey]) return "wings";
    if (g.wingsKey && privacy[g.wingsKey]) return "wings";
    return "off";
  };

  const setGroupValue = (g: typeof PRIVACY_GROUPS[number], v: PrivacyOption) => {
    if (g.noPublic) {
      // Only off/wings for these groups
      const updates: Partial<PrivacySettings> = { [g.publicKey]: v === "wings" };
      save({ privacy: { ...privacy, ...updates } });
    } else {
      const updates: Partial<PrivacySettings> = { [g.publicKey]: v === "public" };
      if (g.wingsKey) updates[g.wingsKey] = v === "wings" || v === "public";
      save({ privacy: { ...privacy, ...updates } });
    }
    flash();
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#c084fc] to-[#818cf8] bg-clip-text text-transparent">Profil</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Configure ton profil public visible par les autres joueurs</p>
      </div>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Profil public</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-4">Visible par les autres utilisateurs dans l&apos;onglet Wings.</p>
        <div className="space-y-4">
          {/* Profile photo */}
          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Photo de profil</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-bright)] flex items-center justify-center overflow-hidden border border-[var(--border)]">
                {profile?.profilePhoto ? (
                  <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-[var(--primary)]">{profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
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
                      if (file.size > 500_000) { alert("Photo trop lourde (max 500 Ko)"); return; }
                      const reader = new FileReader();
                      reader.onload = () => { save({ profilePhoto: reader.result as string }); flash(); };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors cursor-pointer">
                    Choisir une photo
                  </span>
                </label>
                {profile?.profilePhoto && (
                  <button onClick={() => { save({ profilePhoto: null }); flash(); }} className="text-[10px] text-[var(--error)] hover:underline text-left">
                    Retirer la photo
                  </button>
                )}
                <p className="text-[10px] text-[var(--outline)]">Max 500 Ko. Seule cette photo sera visible par les autres.</p>
              </div>
            </div>
          </div>

          <Input label="Nom d'utilisateur" id="pu" placeholder="ex: mathieu_75" value={profile?.username ?? ""} onChange={(e) => { save({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); flash(); }} />
          <Input label="Prenom" id="pfn" placeholder="Ton prenom" value={profile?.firstName ?? ""} onChange={(e) => { save({ firstName: e.target.value }); flash(); }} />
          <Input label="Date de naissance" id="pbd" type="date" value={profile?.birthDate ?? ""} onChange={(e) => { save({ birthDate: e.target.value || null }); flash(); }} />
          <MapPicker
            label="Ville"
            lat={profile?.lat ?? 48.8566}
            lng={profile?.lng ?? 2.3522}
            address={profile?.location ?? ""}
            onAddressChange={(loc) => { save({ location: loc }); flash(); }}
            onCoordsChange={(newLat, newLng) => { save({ lat: newLat, lng: newLng }); flash(); }}
          />
          <TextArea label="Bio" id="pbio" placeholder="Quelques mots sur toi et ta game..." rows={2} value={profile?.bio ?? ""} onChange={(e) => { save({ bio: e.target.value }); flash(); }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--on-surface-variant)]">Profil visible publiquement</p>
              <p className="text-[10px] text-[var(--outline)]">Les autres utilisateurs pourront te trouver dans Découvrir</p>
            </div>
            <button
              onClick={() => { save({ isPublic: !(profile?.isPublic) }); flash(); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${profile?.isPublic ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${profile?.isPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Sauvegardé !</p>}
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Confidentialité</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-5">Choisis ce que tu partages et avec qui.</p>
        <div className="space-y-5">
          {PRIVACY_GROUPS.map((g) => {
            const current = getGroupValue(g);
            const options: { value: PrivacyOption; label: string; activeClass: string }[] = [
              { value: "off", label: "Privé", activeClass: "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]" },
              ...(g.wingsKey ? [{ value: "wings" as PrivacyOption, label: "Wings", activeClass: "bg-[var(--tertiary)]/20 text-[var(--tertiary)]" }] : []),
              ...(!g.noPublic ? [{ value: "public" as PrivacyOption, label: "Public", activeClass: "bg-emerald-400/20 text-emerald-400" }] : []),
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
