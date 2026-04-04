"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS, TYPE_COLORS } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { InteractionForm } from "@/components/interactions/InteractionForm";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getById, toggleGoal, addInteraction, remove, loaded } = useSessions();
  const { interactions, add: addNewInteraction } = useInteractions();
  const [showDelete, setShowDelete] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  const session = getById(id);
  if (!session) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[#adaaab] mb-4">Session introuvable</p><Button variant="secondary" onClick={() => router.push("/sessions")}>Retour</Button></div>;

  const sessionInteractions = interactions.filter((i) => session.interactionIds.includes(i.id));
  const closes = sessionInteractions.filter((i) => i.result === "close").length;
  const avgFeeling = sessionInteractions.length > 0
    ? (sessionInteractions.reduce((s, i) => s + i.feelingScore, 0) / sessionInteractions.length).toFixed(1) : "—";

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/sessions")} className="flex items-center gap-1 text-sm text-[#adaaab] hover:text-white transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Sessions
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{session.title || "Session"}</h1>
          <p className="text-sm text-[#adaaab]">{formatDate(session.date)} {session.location && `· ${session.location}`}</p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Supprimer</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center !p-4">
          <p className="text-2xl font-bold text-[#85adff]">{sessionInteractions.length}</p>
          <p className="text-[10px] text-[#484849]">Interactions</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-2xl font-bold text-emerald-400">{closes}</p>
          <p className="text-[10px] text-[#484849]">Closes</p>
        </Card>
        <Card className="text-center !p-4">
          <p className="text-2xl font-bold text-[#ac8aff]">{avgFeeling}</p>
          <p className="text-[10px] text-[#484849]">Ressenti moy.</p>
        </Card>
      </div>

      {/* Wings */}
      {session.wings.length > 0 && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Wings</h2>
          <div className="flex gap-2">{session.wings.map((w) => <span key={w} className="text-xs px-3 py-1 rounded-full bg-[#262627] text-[#adaaab]">{w}</span>)}</div>
        </Card>
      )}

      {/* Goals */}
      {session.goals.length > 0 && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Objectifs</h2>
          <div className="space-y-2">
            {session.goals.map((g, i) => (
              <button key={i} onClick={() => toggleGoal(id, i)} className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${g.done ? "bg-[#85adff] border-[#85adff]" : "border-[#484849]"}`}>
                  {g.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${g.done ? "text-[#adaaab] line-through" : "text-white"}`}>{g.text}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Interactions */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Interactions ({sessionInteractions.length})</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowAddInteraction(true)}>+ Interaction</Button>
        </div>
        {sessionInteractions.length === 0 ? (
          <p className="text-xs text-[#484849]">Aucune interaction rattachee</p>
        ) : (
          <div className="space-y-2">
            {sessionInteractions.map((i) => (
              <Link key={i.id} href={`/interactions/${i.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#85adff]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#85adff]">{i.feelingScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white font-medium">{i.firstName || "Anonyme"}</span>
                  <div className="flex gap-1 mt-0.5">
                    <Badge className={TYPE_COLORS[i.type]}>{APPROACH_LABELS[i.type]}</Badge>
                    <Badge className={RESULT_COLORS[i.result]}>{RESULT_LABELS[i.result]}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      {session.notes && (
        <Card className="!p-4">
          <h2 className="text-sm font-semibold text-white mb-2">Notes</h2>
          <p className="text-sm text-[#adaaab] leading-relaxed whitespace-pre-wrap">{session.notes}</p>
        </Card>
      )}

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer la session">
        <p className="text-sm text-[#adaaab] mb-6">Es-tu sur ? Les interactions ne seront pas supprimees.</p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={() => { remove(id); router.push("/sessions"); }}>Supprimer</Button>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Annuler</Button>
        </div>
      </Modal>

      {/* Add interaction modal with session location pre-filled */}
      <Modal open={showAddInteraction} onClose={() => setShowAddInteraction(false)} title="Nouvelle interaction">
        <InteractionForm
          defaultLocation={session.location}
          defaultSessionId={session.id}
          onSubmit={(data) => {
            const interaction = addNewInteraction(data);
            addInteraction(id, interaction.id);
            setShowAddInteraction(false);
          }}
        />
      </Modal>
    </div>
  );
}
