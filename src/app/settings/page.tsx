"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { useWings } from "@/hooks/useWings";
import { useMissions } from "@/hooks/useMissions";
import { useJournal } from "@/hooks/useJournal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { clearAllUserData } from "@/lib/db";
import { useTheme } from "@/hooks/useTheme";
import { TutorialResetButton } from "@/components/layout/Tutorial";

export default function SettingsPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { profile, updateProfile } = useProfile();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();
  const { sessions } = useSessions();
  const { wings } = useWings();
  const { missions } = useMissions();
  const { entries: journal } = useJournal();
  const [showClear, setShowClear] = useState(false);
  const [saved, setSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

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

  const handleClearAll = async () => {
    if (!userId) return;
    await clearAllUserData(userId);
    setShowClear(false);
    window.location.reload();
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#6b6580] to-[#c084fc] bg-clip-text text-transparent">Parametres</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Configuration</p>
      </div>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Profil prive</h2>
        <div className="space-y-4">
          <Input label="Nom" id="pn" placeholder="Ton prenom ou pseudo" value={profile.name} onChange={(e) => handleSaveName(e.target.value)} />
          <TextArea label="Objectifs game" id="go" placeholder="Tes objectifs en game (ex: 10 dates ce mois, oser les directs...)" rows={3} value={profile.gameObjectives ?? ""} onChange={(e) => { updateProfile({ gameObjectives: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
          <TextArea label="Femme ideale" id="iw" placeholder="Decris le type de femme que tu recherches..." rows={3} value={profile.idealWoman ?? ""} onChange={(e) => { updateProfile({ idealWoman: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Sauvegarde !</p>}
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Donnees</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Interactions</span><span className="text-sm font-semibold text-[var(--primary)]">{interactions.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Contacts</span><span className="text-sm font-semibold text-[var(--tertiary)]">{contacts.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Sessions</span><span className="text-sm font-semibold text-cyan-400">{sessions.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Wings</span><span className="text-sm font-semibold text-amber-400">{wings.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Missions</span><span className="text-sm font-semibold text-emerald-400">{missions.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Journal</span><span className="text-sm font-semibold text-[var(--secondary)]">{journal.length}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-[var(--on-surface-variant)]">Stockage</span><span className="text-sm text-[var(--outline)]">Supabase</span></div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Installer l&apos;app</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-3">Ajoute GameProgress sur ton ecran d&apos;accueil pour un acces rapide.</p>
        {installPrompt ? (
          <Button size="sm" onClick={() => { (installPrompt as any).prompt(); }}>Installer</Button>
        ) : (
          <p className="text-xs text-[var(--outline)]">Sur mobile : ouvre le menu du navigateur → &quot;Ajouter a l&apos;ecran d&apos;accueil&quot;.<br/>Sur PC : clique sur l&apos;icone d&apos;installation dans la barre d&apos;adresse.</p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Apparence</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--on-surface-variant)]">Mode {theme === "dark" ? "sombre" : "clair"}</p>
            <p className="text-[10px] text-[var(--outline)]">Basculer entre le theme clair et sombre</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors ${theme === "light" ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${theme === "light" ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Aide</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-3">Redecouvre les fonctionnalites de GameProgress.</p>
        <TutorialResetButton />
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Actions</h2>
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-[var(--on-surface-variant)]">Effacer tout</p><p className="text-[10px] text-[var(--outline)]">Supprime toutes les donnees (interactions, contacts, sessions, missions, journal...)</p></div>
          <Button variant="danger" size="sm" onClick={() => setShowClear(true)}>Reset</Button>
        </div>
      </Card>

      <Modal open={showClear} onClose={() => setShowClear(false)} title="Effacer tout">
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Toutes tes donnees seront supprimees de facon irreversible : interactions, contacts, sessions, wings, missions, journal, profil et progression.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleClearAll}>Effacer tout</Button>
          <Button variant="ghost" onClick={() => setShowClear(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}
