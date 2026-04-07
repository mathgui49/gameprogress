"use client";

import { useState, useEffect, useMemo } from "react";
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

const TRACKING_OPTIONS: { value: MissionTrackingType; label: string; icon: string }[] = [
  { value: "interactions", label: "Interactions", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { value: "closes", label: "Closes", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: "sessions", label: "Sessions", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" },
  { value: "dates", label: "Dates", icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" },
  { value: "journal", label: "Journal", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { value: "contacts", label: "Contacts", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { value: "custom", label: "Personnalisé", icon: "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" },
];

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

  // Stats
  const totalXpEarned = useMemo(() => completed.reduce((s, m) => s + m.xpReward, 0), [completed]);
  const completionRate = useMemo(() => missions.length > 0 ? Math.round((completed.length / missions.length) * 100) : 0, [missions, completed]);

  // Auto-sync
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
    if (diff < 0) return <span className="text-[#fb7185] font-semibold">Expiré</span>;
    if (diff === 0) return <span className="text-amber-400 font-semibold">Aujourd&apos;hui</span>;
    if (diff <= 3) return <span className="text-amber-400">{diff}j restants</span>;
    return <span className="text-[var(--outline)]">{date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>;
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#f472b6] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Missions</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Défis et objectifs pour gagner de l&apos;XP</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && <ProBadge />}
          <Button onClick={() => setShowNew(true)} disabled={!isPremium} className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Mission
          </Button>
        </div>
      </div>

      {/* ─── Stats Hero ─── */}
      {(missions.length > 0 || activeChallenges.length > 0) && (
        <div className="relative rounded-[22px] overflow-hidden glass-card border border-[var(--glass-border)] mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f472b6]/[0.04] to-[var(--primary)]/[0.04]" />
          <div className="relative grid grid-cols-3">
            {[
              { label: "En cours", value: active.length + activeChallenges.length, color: "text-[var(--primary)]", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
              { label: "Complétées", value: completed.length, color: "text-emerald-400", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "XP gagné", value: totalXpEarned, color: "text-amber-400", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
            ].map((stat, i) => (
              <div key={stat.label} className={`flex flex-col items-center py-5 gap-1 ${i < 2 ? "border-r border-[var(--glass-border)]" : ""}`}>
                <div className="w-9 h-9 rounded-[12px] bg-[var(--surface-high)] flex items-center justify-center mb-1">
                  <svg className={`w-4 h-4 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <span className={`text-2xl font-bold font-[family-name:var(--font-grotesk)] ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] text-[var(--outline)] tracking-wide uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
          {/* Completion bar */}
          {missions.length > 0 && (
            <div className="px-5 pb-4">
              <div className="flex justify-between text-[10px] text-[var(--outline)] mb-1">
                <span>Progression globale</span>
                <span>{completionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#f472b6] to-[#c084fc] transition-all duration-700" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Pending Challenges ─── */}
      {pendingReceived.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Défis reçus</span>
          </div>
          <div className="space-y-3">
            {pendingReceived.map((c) => (
              <div key={c.id} className="rounded-[16px] border border-amber-400/25 bg-gradient-to-r from-amber-400/[0.05] to-transparent p-4 hover:border-amber-400/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[var(--on-surface)]">{c.title}</p>
                        <Badge className="bg-amber-400/15 text-amber-400">Défi</Badge>
                      </div>
                      <p className="text-xs text-[var(--outline)]">
                        Par <span className="text-[var(--primary)] font-medium">{getWingName(c.createdBy)}</span> — {c.target} {METRIC_LABELS[c.metric]} avant le {new Date(c.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/10">+{CHALLENGE_XP} XP</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAcceptChallenge(c.id, c)} className="flex-1">Accepter</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeclineChallenge(c.id)}>Refuser</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Active Challenges (vs Wing) ─── */}
      {activeChallenges.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--neon-purple)]" />
            <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">Défis en cours</span>
          </div>
          <div className="space-y-3">
            {activeChallenges.map((c) => {
              const isCreator = c.createdBy !== c.targetUserId;
              const myProgress = isCreator ? c.currentCreator : c.currentTarget;
              const opponentProgress = isCreator ? c.currentTarget : c.currentCreator;
              const pct = Math.min((myProgress / c.target) * 100, 100);
              const opPct = Math.min((opponentProgress / c.target) * 100, 100);
              const opponentName = getWingName(isCreator ? c.targetUserId : c.createdBy);
              const winning = myProgress > opponentProgress;
              return (
                <div key={c.id} className="rounded-[16px] glass-card border border-[var(--glass-border)] p-4 overflow-hidden relative">
                  {winning && <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-400/60 via-emerald-400 to-emerald-400/60" />}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-[var(--on-surface)]">{c.title}</p>
                          <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">vs {opponentName}</Badge>
                        </div>
                        <p className="text-xs text-[var(--outline)]">{c.target} {METRIC_LABELS[c.metric]} — {formatDeadline(c.deadline)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[var(--primary)] px-2 py-0.5 rounded-md bg-[var(--primary)]/10">+{CHALLENGE_XP} XP</span>
                  </div>
                  {/* Dual progress bars */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-[var(--on-surface)]">Toi</span>
                        <span className="text-[11px] font-bold text-[var(--on-surface)] tabular-nums">{myProgress}/{c.target}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-700 relative" style={{ width: `${pct}%` }}>
                          {pct > 10 && <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[var(--outline)]">{opponentName}</span>
                        <span className="text-[11px] text-[var(--outline)] tabular-nums">{opponentProgress}/{c.target}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#67e8f9] transition-all duration-700" style={{ width: `${opPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {missions.length === 0 && pendingReceived.length === 0 && activeChallenges.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={28} />}
          title="Aucune mission"
          description={isPremium
            ? "Crée ta première mission pour commencer à gagner de l'XP."
            : "Les missions personnalisées sont réservées à GameMax. Les missions automatiques apparaissent chaque jour."
          }
          action={isPremium ? <Button onClick={() => setShowNew(true)}>Créer une mission</Button> : undefined}
        />
      ) : (
        <>
          {/* ─── Active Missions ─── */}
          {active.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">En cours ({active.length})</span>
              </div>
              <div className="space-y-3">
                {active.map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  const isAuto = m.trackingType !== "custom";
                  const isNearComplete = pct >= 80;
                  const trackIcon = TRACKING_OPTIONS.find((t) => t.value === m.trackingType)?.icon;
                  return (
                    <div key={m.id} className={`rounded-[16px] glass-card border overflow-hidden transition-all ${
                      isNearComplete ? "border-emerald-400/30 shadow-[0_0_16px_-6px_rgba(52,211,153,0.3)]" : "border-[var(--glass-border)]"
                    }`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isNearComplete ? "bg-emerald-400/15" : "bg-[var(--primary)]/10"
                            }`}>
                              {trackIcon ? (
                                <svg className={`w-5 h-5 ${isNearComplete ? "text-emerald-400" : "text-[var(--primary)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={trackIcon} />
                                </svg>
                              ) : (
                                <IconTarget size={20} className={isNearComplete ? "text-emerald-400" : "text-[var(--primary)]"} />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="text-sm font-semibold text-[var(--on-surface)]">{m.title}</p>
                                <Badge className={isAuto ? "bg-emerald-400/15 text-emerald-400" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}>
                                  {MISSION_TRACKING_LABELS[m.trackingType]}
                                </Badge>
                              </div>
                              {m.description && <p className="text-xs text-[var(--outline)]">{m.description}</p>}
                              {m.deadline && <p className="text-[10px] mt-1">{formatDeadline(m.deadline)}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-[var(--primary)] px-2 py-0.5 rounded-md bg-[var(--primary)]/8">+{m.xpReward} XP</span>
                            <Tooltip text="Supprimer" position="bottom">
                              <button onClick={() => remove(m.id)} className="p-1 rounded-lg text-[var(--outline)] hover:text-[var(--error)] hover:bg-[var(--error)]/5 transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                        {/* Progress */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-3 rounded-full bg-[var(--surface-highest)] overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${
                                isNearComplete
                                  ? "bg-gradient-to-r from-emerald-400 to-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                  : "bg-gradient-to-r from-[#c084fc] to-[#f472b6]"
                              }`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[var(--on-surface)] tabular-nums min-w-[52px] text-right">{m.current}/{m.target}</span>
                          {!isAuto && (
                            <Tooltip text="Avancer de +1" position="left">
                              <button onClick={() => progress(m.id)} className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      {/* Percentage badge at bottom */}
                      <div className="px-4 py-2 bg-[var(--surface-high)]/30 border-t border-[var(--glass-border)] flex items-center justify-between">
                        <span className="text-[10px] text-[var(--outline)]">{Math.round(pct)}% complété</span>
                        {isNearComplete && pct < 100 && (
                          <span className="text-[10px] text-emerald-400 font-medium animate-pulse">Presque fini !</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Completed Missions ─── */}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">Terminées ({completed.length})</span>
                </div>
                <span className="text-[10px] text-[var(--outline)]">{totalXpEarned} XP total</span>
              </div>
              <div className="space-y-2">
                {completed.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-[var(--surface-high)]/30 border border-[var(--border)] transition-all">
                    <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--on-surface)] font-medium truncate">{m.title}</p>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold shrink-0">+{m.xpReward} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Create Mission Modal ─── */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setTitle(""); setDesc(""); setTarget("3"); setTrackingType("interactions"); setDeadline(""); }} title="Nouvelle mission">
        <div className="space-y-4">
          <Input label="Titre" placeholder="Ex: 3 sessions avant juillet" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Description (optionnel)" placeholder="Détails de la mission..." value={desc} onChange={(e) => setDesc(e.target.value)} />

          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Type de suivi</p>
            <div className="grid grid-cols-2 gap-2">
              {TRACKING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTrackingType(o.value)}
                  className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border transition-all ${
                    trackingType === o.value
                      ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/25 font-medium"
                      : "bg-transparent text-[var(--on-surface-variant)] border-[var(--border)] hover:bg-[var(--surface-high)]"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={o.icon} />
                  </svg>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-2 text-[var(--outline)]">
              {trackingType !== "custom" ? "Progression automatique basée sur tes données" : "Tu avanceras la progression manuellement avec +1"}
            </p>
          </div>

          <Input label="Objectif (nombre)" type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Input label="Deadline (optionnel)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

          <Button className="w-full" disabled={!title.trim()} onClick={async (e) => {
            const btn = e.currentTarget; if (btn.disabled) return; btn.disabled = true;
            await add(title, desc, "custom", Number(target) || 3, 20, trackingType, deadline || null);
            setTitle(""); setDesc(""); setTarget("3"); setTrackingType("interactions"); setDeadline(""); setShowNew(false);
          }}>
            Créer la mission
          </Button>
        </div>
      </Modal>
    </div>
  );
}
