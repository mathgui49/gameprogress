"use client";

import { useState } from "react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { PrivacySettings } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { Card } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";

const PRIVACY_TOGGLES: { key: keyof PrivacySettings; label: string; hint: string }[] = [
  { key: "showInWingList", label: "Visible dans la liste Wings", hint: "Les utilisateurs peuvent te trouver dans Decouvrir" },
  { key: "showInLeaderboardPublic", label: "Classement public", hint: "Apparaitre dans le classement visible par tous" },
  { key: "showInLeaderboardWings", label: "Classement wings", hint: "Apparaitre dans le classement visible par tes wings" },
  { key: "shareStatsPublic", label: "Stats publiques", hint: "Tes statistiques sont visibles par tous" },
  { key: "shareStatsWings", label: "Stats wings", hint: "Tes statistiques sont visibles par tes wings" },
  { key: "shareReportsWithWings", label: "Rapports wings", hint: "Partager tes rapports avec tes wings" },
];

export default function ProfilPage() {
  const { profile, loaded, save } = usePublicProfile();
  const [saved, setSaved] = useState(false);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const privacy = profile?.privacy ?? DEFAULT_PRIVACY;

  const togglePrivacy = (key: keyof PrivacySettings) => {
    save({ privacy: { ...privacy, [key]: !privacy[key] } });
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
          <Input label="Ville" id="ploc" placeholder="ex: Paris, Lyon, Marseille..." value={profile?.location ?? ""} onChange={(e) => { save({ location: e.target.value }); flash(); }} />
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
        <p className="text-xs text-[#a09bb2] mb-4">Choisis ce que tu partages et avec qui.</p>
        <div className="space-y-4">
          {PRIVACY_TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#a09bb2]">{t.label}</p>
                <p className="text-[10px] text-[#6b6580]">{t.hint}</p>
              </div>
              <button
                onClick={() => togglePrivacy(t.key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${privacy[t.key] ? "bg-[#c084fc]" : "bg-[#3d3650]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${privacy[t.key] ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
