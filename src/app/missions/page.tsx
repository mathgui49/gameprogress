"use client";

import { useState, useEffect } from "react";
import { useMissions } from "@/hooks/useMissions";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { useJournal } from "@/hooks/useJournal";
import { useWingChallenges } from "@/hooks/useWingChallenges";
import { useWingRequests } from "@/hooks/useWingRequests";
import { useToast } from "@/hooks/useToast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconTarget } from "@/components/ui/Icons";
import type { MissionTrackingType } from "@/types";
import { MISSION_TRACKING_LABELS } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";
import { ProBadge } from "@/components/ui/PremiumGate";

const TRACKING_OPTIONS: { value: MissionTrackingType; label: string }[] = Object.entries(MISSION_TRACKING_LABELS).map(([value, label]) => ({ value: value as MissionTrackingType, label }));

export default function MissionsPage() {
  const { missions, active, completed, loaded, add, progress, syncAutoProgress, remove } = useMissions();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();
  const { sessions } = useSessions();
  const { entries: journal } = useJournal();

  const { isPremium } = useSubscription();
  const { pendingReceived, active: activeChallenges, acceptChallenge, declineChallenge } = useWingChallenges();
  const { wingProfiles } = useWingRequests();
  const toast = useToast();

  const getWingName = (uid: string) => wingProfiles.find((w) => w.userId === uid)?.firstName || "Wing";

  const METRIC_LABELS: Record<string, string> = { approaches: "approches", closes: "closes", sessions: "sessions", custom: "personnalisé" };
  const CHALLENGE_XP = 50;

  const handleAcceptChallenge = async (challengeId: string, challenge: typeof activeChallenges[0]) => {
    await acceptChallenge(challengeId);
    // Create a mission for the tracking
    const trackingMap: Record<string, MissionTrackingType> = { approaches: "interactions", closes: "closes", sessions: "sessions", custom: "custom" };
    await add(
      `Défi: ${challenge.title}`,
      `Défi lancé par ${getWingName(challenge.createdBy)} — ${challenge.target} ${METRIC_LABELS[challenge.metric]}`,
      "custom",
      challenge.target,
      CHALLENGE_XP,
      trackingMap[challenge.metric] || "custom",
      challenge.deadline
    );
    toast.show("Défi accepté ! Mission ajoutée.", "success");
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    await declineChallenge(challengeId);
    toast.show("Défi refusé", "info");
  };

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("3");
  const [trackingType, setTrackingType] = useState<MissionTrackingType>("interactions");
  const [deadline, setDeadline] = useState("");

  // Auto-sync progress for tracked missions
  useEffect(() => {
    if (!loaded) return;
    const closes = interactions.filter((i) => i.result === "close").length;
    const dates = contacts.filter((c) => ["date_planned", "first_date", "second_date", "kissclose", "fuckclose", "advanced"].includes(c.status)).length;
    syncAutoProgress({
      interactions: interactions.length,
      closes,
      sessions: sessions.length,
      dates,
      journal: journal.length,
      contacts: contacts.length,
    });
  }, [loaded, interactions.length, contacts.length, sessions.length, journal.length]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const formatDeadline = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-[#fb7185]">Expire</span>;
    if (diff === 0) return <span className="text-amber-400">Aujourd&apos;hui</span>;
    if (diff <= 3) return <span className="text-amber-400">{diff}j restants</span>;
    return <span className="text-[var(--outline)]">{date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>;
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#f472b6] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Missions</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Défis quotidiens et hebdomadaires pour gagner de l'XP — {active.length} active{active.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && <ProBadge />}
          <Button onClick={() => setShowNew(true)} disabled={!isPremium}>+ Mission{!isPremium ? " (GameMax)" : ""}</Button>
        </div>
      </div>

      {/* Pending challenges received */}
      {pendingReceived.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3">Défis reçus</h2>
          <div className="space-y-3">
            {pendingReceived.map((c) => (
              <Card key={c.id} className="!p-4 border-amber-400/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--on-surface)]">{c.title}</p>
                      <Badge className="bg-amber-400/15 text-amber-400">Défi</Badge>
                    </div>
                    <p className="text-xs text-[var(--outline)]">
                      Lancé par <span className="text-[var(--primary)]">{getWingName(c.createdBy)}</span> — {c.target} {METRIC_LABELS[c.metric]} avant le {new Date(c.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--primary)]">+{CHALLENGE_XP} XP</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => handleAcceptChallenge(c.id, c)}>Accepter le défi</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeclineChallenge(c.id)}>Refuser</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active challenges as missions */}
      {activeChallenges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[var(--primary)] uppercase tracking-wider mb-3">Défis en cours</h2>
          <div className="space-y-3">
            {activeChallenges.map((c) => {
              const isCreator = c.createdBy !== c.targetUserId;
              const myProgress = isCreator ? c.currentCreator : c.currentTarget;
              const opponentProgress = isCreator ? c.currentTarget : c.currentCreator;
              const pct = Math.min((myProgress / c.target) * 100, 100);
              const opponentName = getWingName(isCreator ? c.targetUserId : c.createdBy);
              return (
                <Card key={c.id} className="!p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-[var(--on-surface)]">{c.title}</p>
                        <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">Défi vs {opponentName}</Badge>
                      </div>
                      <p className="text-xs text-[var(--outline)]">{c.target} {METRIC_LABELS[c.metric]} — {formatDeadline(c.deadline)}</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--primary)]">+{CHALLENGE_XP} XP</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--on-surface-variant)] w-10">Toi</span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[var(--on-surface-variant)] w-10 text-right">{myProgress}/{c.target}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--outline)] w-10">{opponentName}</span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#67e8f9] transition-all duration-500" style={{ width: `${Math.min((opponentProgress / c.target) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-[var(--outline)] w-10 text-right">{opponentProgress}/{c.target}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {missions.length === 0 && pendingReceived.length === 0 && activeChallenges.length === 0 ? (
        <EmptyState icon={<IconTarget size={28} />} title="Aucune mission" description={isPremium ? "Crée ta première mission pour commencer à gagner de l'XP." : "Les missions personnalisées sont réservées à GameMax. Les missions automatiques apparaissent chaque jour."} action={isPremium ? <Button onClick={() => setShowNew(true)}>Créer une mission</Button> : undefined} />
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">En cours</h2>
              <div className="space-y-3">
                {active.map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  const isAuto = m.trackingType !== "custom";
                  return (
                    <Card key={m.id} className="!p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-[var(--on-surface)]">{m.title}</p>
                            <Badge className={isAuto ? "bg-emerald-400/15 text-emerald-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}>
                              {MISSION_TRACKING_LABELS[m.trackingType]}
                            </Badge>
                          </div>
                          {m.description && <p className="text-xs text-[var(--outline)]">{m.description}</p>}
                          {m.deadline && <p className="text-[10px] mt-1">{formatDeadline(m.deadline)}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--primary)]">+{m.xpReward} XP</span>
                          <Tooltip text="Supprimer la mission" position="bottom">
                            <button onClick={() => remove(m.id)} className="text-[var(--outline)] hover:text-[#fb7185] transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-[var(--on-surface-variant)] w-12 text-right">{m.current}/{m.target}</span>
                        {!isAuto && <Tooltip text="Avancer la progression manuellement" position="left"><Button variant="secondary" size="sm" onClick={() => progress(m.id)}>+1</Button></Tooltip>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">Terminées</h2>
              <div className="space-y-2">
                {completed.map((m) => (
                  <Card key={m.id} className="!p-4 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400">&#10003;</span>
                        <p className="text-sm text-[var(--on-surface)]">{m.title}</p>
                      </div>
                      <span className="text-xs text-emerald-400">+{m.xpReward} XP</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setTitle(""); setDesc(""); setTarget("3"); setTrackingType("interactions"); setDeadline(""); }} title="Nouvelle mission">
        <div className="space-y-4">
          <Input label="Titre" placeholder="Ex: 3 sessions avant juillet" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Description" placeholder="Description optionnelle" value={desc} onChange={(e) => setDesc(e.target.value)} />

          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Type de suivi</p>
            <div className="flex flex-wrap gap-2">
              {TRACKING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTrackingType(o.value)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    trackingType === o.value ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {trackingType !== "custom" && (
              <p className="text-[10px] text-emerald-400 mt-2">Progression auto : se met a jour quand tu ajoutes des {MISSION_TRACKING_LABELS[trackingType].toLowerCase()}</p>
            )}
            {trackingType === "custom" && (
              <p className="text-[10px] text-[var(--outline)] mt-2">Manuel : tu avanceras la progression toi-même avec le bouton +1</p>
            )}
          </div>

          <Input label="Objectif (nombre)" type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Input label="Deadline (optionnel)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

          <Button disabled={!title.trim()} onClick={async (e) => {
            const btn = e.currentTarget; if (btn.disabled) return; btn.disabled = true;
            await add(title, desc, "custom", Number(target) || 3, 20, trackingType, deadline || null);
            setTitle(""); setDesc(""); setTarget("3"); setTrackingType("interactions"); setDeadline(""); setShowNew(false);
          }}>
            Créer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
