"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export default function SettingsPage() {
  const { profile, updateProfile } = useProfile();
  const { interactions, reset, clear } = useInteractions();
  const { contacts } = useContacts();
  const [showReset, setShowReset] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [saved, setSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleSaveName = (name: string) => {
    updateProfile({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Parametres</h1>
        <p className="text-sm text-[#a09bb2]">Configuration</p>
      </div>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Profil</h2>
        <div className="space-y-4">
          <Input label="Nom" id="pn" placeholder="Ton prenom ou pseudo" value={profile.name} onChange={(e) => handleSaveName(e.target.value)} />
          <TextArea label="Objectifs game" id="go" placeholder="Tes objectifs en game (ex: 10 dates ce mois, oser les directs...)" rows={3} value={profile.gameObjectives ?? ""} onChange={(e) => { updateProfile({ gameObjectives: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
          <TextArea label="Femme ideale" id="iw" placeholder="Decris le type de femme que tu recherches..." rows={3} value={profile.idealWoman ?? ""} onChange={(e) => { updateProfile({ idealWoman: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Sauvegarde !</p>}
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Donnees</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm text-[#a09bb2]">Interactions</span><span className="text-sm font-semibold text-[#c084fc]">{interactions.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[#a09bb2]">Contacts</span><span className="text-sm font-semibold text-[#818cf8]">{contacts.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[#a09bb2]">Stockage</span><span className="text-sm text-[#6b6580]">localStorage</span></div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-3">Installer l&apos;app</h2>
        <p className="text-xs text-[#a09bb2] mb-3">Ajoute GameTrack sur ton ecran d&apos;accueil pour un acces rapide.</p>
        {installPrompt ? (
          <Button size="sm" onClick={() => { (installPrompt as any).prompt(); }}>Installer</Button>
        ) : (
          <p className="text-xs text-[#6b6580]">Sur mobile : ouvre le menu du navigateur → &quot;Ajouter a l&apos;ecran d&apos;accueil&quot;.<br/>Sur PC : clique sur l&apos;icone d&apos;installation dans la barre d&apos;adresse.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-4">Actions</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-[#a09bb2]">Donnees exemple</p><p className="text-[10px] text-[#6b6580]">Remplace par des exemples</p></div>
            <Button variant="secondary" size="sm" onClick={() => setShowReset(true)}>Seed</Button>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-[#a09bb2]">Effacer tout</p><p className="text-[10px] text-[#6b6580]">Supprime toutes les donnees</p></div>
            <Button variant="danger" size="sm" onClick={() => setShowClear(true)}>Reset</Button>
          </div>
        </div>
      </Card>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Charger les exemples">
        <p className="text-sm text-[#a09bb2] mb-6">Cela remplace toutes tes donnees. Continuer ?</p>
        <div className="flex items-center gap-3">
          <Button onClick={() => { reset(); setShowReset(false); }}>Confirmer</Button>
          <Button variant="ghost" onClick={() => setShowReset(false)}>Annuler</Button>
        </div>
      </Modal>

      <Modal open={showClear} onClose={() => setShowClear(false)} title="Effacer tout">
        <p className="text-sm text-[#a09bb2] mb-6">Toutes tes donnees seront supprimees. Irreversible.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={() => { clear(); setShowClear(false); }}>Effacer</Button>
          <Button variant="ghost" onClick={() => setShowClear(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
