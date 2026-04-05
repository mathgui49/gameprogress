"use client";

import { useState, useEffect } from "react";
import { useMissions } from "@/hooks/useMissions";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useSessions } from "@/hooks/useSessions";
import { useJournal } from "@/hooks/useJournal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { IconTarget } from "@/components/ui/Icons";
import type { MissionTrackingType } from "@/types";
import { MISSION_TRACKING_LABELS } from "@/types";

const TRACKING_OPTIONS: { value: MissionTrackingType; label: string }[] = Object.entries(MISSION_TRACKING_LABELS).map(([value, label]) => ({ value: value as MissionTrackingType, label }));

export default function MissionsPage() {
  const { missions, active, completed, loaded, add, progress, syncAutoProgress, remove } = useMissions();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();
  const { sessions } = useSessions();
  const { entries: journal } = useJournal();

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

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  const formatDeadline = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-[#fb7185]">Expire</span>;
    if (diff === 0) return <span className="text-amber-400">Aujourd&apos;hui</span>;
    if (diff <= 3) return <span className="text-amber-400">{diff}j restants</span>;
    return <span className="text-[#6b6580]">{date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>;
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Missions</h1>
          <p className="text-sm text-[#a09bb2]">{active.length} active{active.length > 1 ? "s" : ""}, {completed.length} terminee{completed.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Mission</Button>
      </div>

      {missions.length === 0 ? (
        <EmptyState icon={<IconTarget size={28} />} title="Aucune mission" description="Cree ta premiere mission pour commencer a gagner de l'XP." action={<Button onClick={() => setShowNew(true)}>Creer une mission</Button>} />
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-[#a09bb2] uppercase tracking-wider mb-3">En cours</h2>
              <div className="space-y-3">
                {active.map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  const isAuto = m.trackingType !== "custom";
                  return (
                    <Card key={m.id} className="!p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-white">{m.title}</p>
                            <Badge className={isAuto ? "bg-emerald-400/15 text-emerald-400" : "bg-[#1a1626] text-[#a09bb2]"}>
                              {MISSION_TRACKING_LABELS[m.trackingType]}
                            </Badge>
                          </div>
                          {m.description && <p className="text-xs text-[#6b6580]">{m.description}</p>}
                          {m.deadline && <p className="text-[10px] mt-1">{formatDeadline(m.deadline)}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#c084fc]">+{m.xpReward} XP</span>
                          <button onClick={() => remove(m.id)} className="text-[#6b6580] hover:text-[#fb7185] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-[#a09bb2] w-12 text-right">{m.current}/{m.target}</span>
                        {!isAuto && <Button variant="secondary" size="sm" onClick={() => progress(m.id)}>+1</Button>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#a09bb2] uppercase tracking-wider mb-3">Terminees</h2>
              <div className="space-y-2">
                {completed.map((m) => (
                  <Card key={m.id} className="!p-4 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400">&#10003;</span>
                        <p className="text-sm text-white">{m.title}</p>
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
            <p className="text-xs font-medium text-[#a09bb2] mb-2">Type de suivi</p>
            <div className="flex flex-wrap gap-2">
              {TRACKING_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTrackingType(o.value)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    trackingType === o.value ? "bg-[#c084fc]/20 text-[#c084fc]" : "bg-[#1a1626] text-[#a09bb2] hover:bg-[#231e30]"
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
              <p className="text-[10px] text-[#6b6580] mt-2">Manuel : tu avanceras la progression toi-meme avec le bouton +1</p>
            )}
          </div>

          <Input label="Objectif (nombre)" type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Input label="Deadline (optionnel)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

          <Button disabled={!title.trim()} onClick={() => {
            add(title, desc, "custom", Number(target) || 3, 20, trackingType, deadline || null);
            setTitle(""); setDesc(""); setTarget("3"); setTrackingType("interactions"); setDeadline(""); setShowNew(false);
          }}>
            Creer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
