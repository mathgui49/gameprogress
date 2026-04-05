"use client";

import { useState } from "react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { PrivacySettings } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { Card } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";

type PrivacyOption = "off" | "wings" | "public";

const PRIVACY_GROUPS: { label: string; hint: string; publicKey: keyof PrivacySettings; wingsKey?: keyof PrivacySettings; noPublic?: boolean }[] = [
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

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Profil</h1>
        <p className="text-sm text-[#a09bb2]">Ton identite sociale</p>
      </div>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Profil public</h2>
        <p className="text-xs text-[#a09bb2] mb-4">Visible par les autres utilisateurs dans l&apos;onglet Wings.</p>
        <div className="space-y-4">
          <Input label="Nom d'utilisateur" id="pu" placeholder="ex: mathieu_75" value={profile?.username ?? ""} onChange={(e) => { save({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); flash(); }} />
          <Input label="Prenom" id="pfn" placeholder="Ton prenom" value={profile?.firstName ?? ""} onChange={(e) => { save({ firstName: e.target.value }); flash(); }} />
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
              <p className="text-sm text-[#a09bb2]">Profil visible publiquement</p>
              <p className="text-[10px] text-[#6b6580]">Les autres utilisateurs pourront te trouver dans Decouvrir</p>
            </div>
            <button
              onClick={() => { save({ isPublic: !(profile?.isPublic) }); flash(); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${profile?.isPublic ? "bg-[#c084fc]" : "bg-[#3d3650]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${profile?.isPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Sauvegarde !</p>}
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Confidentialite</h2>
        <p className="text-xs text-[#a09bb2] mb-5">Choisis ce que tu partages et avec qui.</p>
        <div className="space-y-5">
          {PRIVACY_GROUPS.map((g) => {
            const current = getGroupValue(g);
            const options: { value: PrivacyOption; label: string; activeClass: string }[] = [
              { value: "off", label: "Prive", activeClass: "bg-[#a09bb2]/20 text-[#a09bb2]" },
              ...(g.wingsKey ? [{ value: "wings" as PrivacyOption, label: "Wings", activeClass: "bg-[#818cf8]/20 text-[#818cf8]" }] : []),
              ...(!g.noPublic ? [{ value: "public" as PrivacyOption, label: "Public", activeClass: "bg-emerald-400/20 text-emerald-400" }] : []),
            ];
            return (
              <div key={g.publicKey}>
                <p className="text-sm text-[#a09bb2] mb-1">{g.label}</p>
                <p className="text-[10px] text-[#6b6580] mb-2">{g.hint}</p>
                <div className="flex gap-2">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setGroupValue(g, o.value)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        current === o.value ? o.activeClass : "bg-[#1a1626] text-[#a09bb2] hover:bg-[#231e30]"
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
