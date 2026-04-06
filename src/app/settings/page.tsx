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
import { clearAllUserDataAction, deleteAccountAction } from "@/actions/db";
import { signOut } from "next-auth/react";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/useToast";
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
  const [clearStep, setClearStep] = useState<1 | 2>(1);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [saved, setSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const toast = useToast();
  const { subscription, isPremium, loaded: subLoaded, checkout, openPortal } = useSubscription();
  const push = usePushNotifications();
  const [checkoutResult, setCheckoutResult] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    if (result) {
      setCheckoutResult(result);
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleSaveName = (name: string) => {
    updateProfile({ name });
    toast.show("Profil sauvegardé");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = async () => {
    if (!userId) return;
    await clearAllUserDataAction();
    toast.show("Toutes les données ont été effacées", "info");
    setShowClear(false);
    setClearStep(1);
    setClearConfirmText("");
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteAccountAction();
      await signOut({ callbackUrl: "/landing" });
    } catch {
      toast.show("Erreur lors de la suppression", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#8a839e] to-[#c084fc] bg-clip-text text-transparent">Paramètres</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Gère ton compte, ta confidentialité et tes préférences</p>
      </div>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Profil privé</h2>
        <div className="space-y-4">
          <Input label="Nom" id="pn" placeholder="Ton prénom ou pseudo" value={profile.name} onChange={(e) => handleSaveName(e.target.value)} />
          <TextArea label="Objectifs game" id="go" placeholder="Tes objectifs en game (ex: 10 dates ce mois, oser les directs...)" rows={3} value={profile.gameObjectives ?? ""} onChange={(e) => { updateProfile({ gameObjectives: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
          <TextArea label="Femme idéale" id="iw" placeholder="Décris le type de femme que tu recherches..." rows={3} value={profile.idealWoman ?? ""} onChange={(e) => { updateProfile({ idealWoman: e.target.value }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} />
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Sauvegardé !</p>}
      </Card>

      {/* Premium / Abonnement */}
      <Card className="mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c084fc]/[0.03] to-[#f472b6]/[0.03]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Abonnement</h2>
            {isPremium && <Badge className="bg-gradient-to-r from-[#c084fc]/20 to-[#f472b6]/20 text-[#c084fc]">GameMax</Badge>}
          </div>

          {checkoutResult === "success" && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
              <p className="text-sm text-emerald-400 font-medium">Paiement réussi ! Ton abonnement Premium est actif.</p>
            </div>
          )}
          {checkoutResult === "cancel" && (
            <div className="mb-4 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <p className="text-sm text-amber-400 font-medium">Paiement annulé. Tu peux réessayer quand tu veux.</p>
            </div>
          )}

          {subLoaded && isPremium ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--on-surface-variant)]">Statut</span>
                <Badge className="bg-emerald-400/15 text-emerald-400">Actif</Badge>
              </div>
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--on-surface-variant)]">Prochain renouvellement</span>
                  <span className="text-sm text-[var(--on-surface)]">{new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={openPortal}>Gérer mon abonnement</Button>
              <p className="text-[10px] text-[var(--outline)]">Factures, modification du moyen de paiement, annulation...</p>
            </div>
          ) : subLoaded ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--on-surface-variant)]">Débloque tout le potentiel de GameProgress avec GameMax.</p>
              <div className="space-y-2">
                {["Interactions, contacts et journal illimités", "Coaching IA personnalisé", "Analytics avancés + heatmap + export PDF", "Wings illimités + challenges + pings", "Tous les badges + rang complet", "Missions weekly & custom", "Classement complet + comparaison"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#c084fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-xs text-[var(--on-surface-variant)]">{f}</span>
                  </div>
                ))}
              </div>
              <Button onClick={checkout} className="w-full">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                  Passer à GameMax — 6,99&euro;/mois
                </span>
              </Button>
              <p className="text-[10px] text-[var(--outline)] text-center">Moins cher qu&apos;un kebab. Satisfait ou remboursé 14 jours.</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Données</h2>
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
        <p className="text-xs text-[var(--on-surface-variant)] mb-3">Ajoute GameProgress sur ton écran d&apos;accueil pour un accès rapide.</p>
        {installPrompt ? (
          <Button size="sm" onClick={() => { (installPrompt as any).prompt(); }}>Installer</Button>
        ) : (
          <p className="text-xs text-[var(--outline)]">Sur mobile : ouvre le menu du navigateur → &quot;Ajouter à l&apos;écran d&apos;accueil&quot;.<br/>Sur PC : clique sur l&apos;icône d&apos;installation dans la barre d&apos;adresse.</p>
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

      {/* Notifications */}
      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Notifications push</h2>
        {!push.supported ? (
          <p className="text-xs text-[var(--outline)]">Les notifications push ne sont pas supportées par ce navigateur.</p>
        ) : (
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--on-surface-variant)]">Activer les notifications</p>
                <p className="text-[10px] text-[var(--outline)]">Recois des rappels pour maintenir ta progression</p>
              </div>
              <button
                onClick={() => push.subscribed ? push.unsubscribe() : push.subscribe()}
                disabled={push.loading}
                className={`relative w-11 h-6 rounded-full transition-colors ${push.subscribed ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"} ${push.loading ? "opacity-50" : ""}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${push.subscribed ? "translate-x-5" : ""}`} />
              </button>
            </div>

            {/* Per-type toggles (only when subscribed) */}
            {push.subscribed && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--on-surface-variant)]">Rappel de streak</p>
                    <p className="text-[10px] text-[var(--outline)]">Rappel quotidien pour maintenir ta flamme</p>
                  </div>
                  <button
                    onClick={() => push.updatePrefs({ notifyStreak: !push.prefs.notifyStreak })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${push.prefs.notifyStreak ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${push.prefs.notifyStreak ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--on-surface-variant)]">Missions</p>
                    <p className="text-[10px] text-[var(--outline)]">Rappel quand tes missions arrivent a echeance</p>
                  </div>
                  <button
                    onClick={() => push.updatePrefs({ notifyMissions: !push.prefs.notifyMissions })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${push.prefs.notifyMissions ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${push.prefs.notifyMissions ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--on-surface-variant)]">Recap hebdomadaire</p>
                    <p className="text-[10px] text-[var(--outline)]">Resume de ta semaine chaque dimanche</p>
                  </div>
                  <button
                    onClick={() => push.updatePrefs({ notifyWeekly: !push.prefs.notifyWeekly })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${push.prefs.notifyWeekly ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${push.prefs.notifyWeekly ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">Aide</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-3">Redécouvre les fonctionnalités de GameProgress.</p>
        <TutorialResetButton />
      </Card>

      <Card>
        <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-4">Actions</h2>
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-[var(--on-surface-variant)]">Effacer tout</p><p className="text-[10px] text-[var(--outline)]">Supprime toutes les donnees (interactions, contacts, sessions, missions, journal...)</p></div>
          <Button variant="danger" size="sm" onClick={() => setShowClear(true)}>Réinitialiser</Button>
        </div>
      </Card>

      <Modal open={showClear} onClose={() => { setShowClear(false); setClearStep(1); setClearConfirmText(""); }} title="Effacer tout">
        {clearStep === 1 ? (
          <>
            <p className="text-sm text-[var(--on-surface-variant)] mb-6">Toutes tes données seront supprimées de façon irréversible : interactions, contacts, sessions, wings, missions, journal, profil et progression.</p>
            <p className="text-sm font-semibold text-[var(--error)] mb-6">Es-tu sûr de vouloir continuer ?</p>
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={() => setClearStep(2)}>Oui, continuer</Button>
              <Button variant="ghost" onClick={() => { setShowClear(false); setClearStep(1); }}>Annuler</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--on-surface-variant)] mb-3">Cette action est définitive. Pour confirmer, écris <strong className="text-[var(--error)]">CONFIRMER</strong> ci-dessous :</p>
            <Input
              id="confirm-clear"
              placeholder="Écris CONFIRMER"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-4">
              <Button variant="danger" disabled={clearConfirmText !== "CONFIRMER"} onClick={handleClearAll}>Effacer définitivement</Button>
              <Button variant="ghost" onClick={() => { setShowClear(false); setClearStep(1); setClearConfirmText(""); }}>Annuler</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Account deletion */}
      <div className="glass-card rounded-2xl p-5 mt-6 border border-red-500/10">
        <h2 className="text-sm font-semibold mb-2 text-red-400">Supprimer mon compte</h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-3">
          Cette action est irréversible. Toutes tes données, photos et contenus seront définitivement supprimés.
        </p>
        <Button variant="danger" size="sm" onClick={() => setShowDeleteAccount(true)}>
          Supprimer mon compte
        </Button>
      </div>

      <Modal open={showDeleteAccount} onClose={() => { setShowDeleteAccount(false); setDeleteStep(1); setDeleteConfirmText(""); }} title="Supprimer mon compte">
        {deleteStep === 1 && (
          <>
            <p className="text-sm text-[var(--on-surface-variant)] mb-4">
              Es-tu sûr de vouloir supprimer ton compte ? Toutes tes données seront effacées définitivement :
              interactions, contacts, journal, messages, XP, badges...
            </p>
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={() => setDeleteStep(2)}>Oui, continuer</Button>
              <Button variant="ghost" onClick={() => setShowDeleteAccount(false)}>Annuler</Button>
            </div>
          </>
        )}
        {deleteStep === 2 && (
          <>
            <p className="text-sm text-[var(--on-surface-variant)] mb-3">
              Pour confirmer, écris <strong className="text-[var(--error)]">SUPPRIMER</strong> ci-dessous :
            </p>
            <Input
              placeholder="Écris SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="danger"
                disabled={deleteConfirmText !== "SUPPRIMER" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Suppression..." : "Supprimer définitivement"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowDeleteAccount(false); setDeleteStep(1); setDeleteConfirmText(""); }}>Annuler</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Legal links */}
      <div className="glass-card rounded-2xl p-5 mt-6">
        <h2 className="text-sm font-semibold mb-3">Informations légales</h2>
        <div className="flex flex-wrap gap-4 text-xs">
          <a href="/cgu" className="text-[#c084fc] hover:underline">Conditions Générales d&apos;Utilisation</a>
          <a href="/rgpd" className="text-[#c084fc] hover:underline">Politique de Confidentialité</a>
          <a href="/mentions-legales" className="text-[#c084fc] hover:underline">Mentions Légales</a>
        </div>
      </div>
    </div>
  );
}
