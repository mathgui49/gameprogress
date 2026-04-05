"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { useWingRequests } from "@/hooks/useWingRequests";
import { useJournal } from "@/hooks/useJournal";
import { fetchSessionParticipantsWithProfilesAction } from "@/actions/db";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS, TYPE_COLORS } from "@/types";
import type { Visibility } from "@/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MapPicker } from "@/components/ui/MapPicker";
import Link from "next/link";
import { InteractionForm } from "@/components/interactions/InteractionForm";

interface ParticipantWithProfile {
  id: string;
  sessionId: string;
  userId: string;
  ownerUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  profile: { userId: string; username: string; firstName: string; location: string; profilePhoto?: string | null } | null;
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.email ?? "";
  const { getById, toggleGoal, addInteraction, remove, loaded } = useSessions();
  const { interactions, add: addNewInteraction } = useInteractions();
  const { isWing } = useWingRequests();
  const { entries: journalEntries, add: addJournalEntry } = useJournal();
  const [showDelete, setShowDelete] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showFieldReport, setShowFieldReport] = useState(false);
  const [frVisibility, setFrVisibility] = useState<Visibility>("private");
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const fieldReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessionParticipantsWithProfilesAction(id).then(setParticipants);
  }, [id]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const session = getById(id);
  if (!session) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[var(--on-surface-variant)] mb-4">Session introuvable</p><Button variant="secondary" onClick={() => router.push("/sessions")}>Retour</Button></div>;

  const isFuture = new Date(session.date).getTime() > Date.now();
  const isPast = new Date(session.date).getTime() < Date.now() - 4 * 3600 * 1000;
  const sessionInteractions = interactions.filter((i) => session.interactionIds.includes(i.id));
  const closes = sessionInteractions.filter((i) => i.result === "close").length;
  const avgFeeling = sessionInteractions.length > 0
    ? (sessionInteractions.reduce((s, i) => s + i.feelingScore, 0) / sessionInteractions.length).toFixed(1) : "\u2014";

  const acceptedParticipants = participants.filter((p) => p.status === "accepted");
  const pendingParticipants = participants.filter((p) => p.status === "pending");
  const isParticipant = acceptedParticipants.some((p) => p.userId === currentUserId) || true; // owner is always participant
  const canSeeParticipants = session.isPublic || isWing(session.wings?.[0] || "") || currentUserId === (participants[0]?.ownerUserId || currentUserId);

  const openNavigation = () => {
    if (session.lat && session.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${session.lat},${session.lng}`, "_blank");
    }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/sessions")} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Sessions
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--on-surface)]">{session.title || "Session"}</h1>
            {session.isPublic && <Badge className="bg-emerald-400/15 text-emerald-400">Publique</Badge>}
            {isFuture && <Badge className="bg-cyan-400/15 text-cyan-400">Planifiée</Badge>}
            {isPast && <Badge className="bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]">Archivée</Badge>}
          </div>
          <p className="text-sm text-[var(--on-surface-variant)]">{formatDate(session.date)} {session.location && `\u00b7 ${session.location}`}</p>
          {session.address && <p className="text-xs text-[var(--outline)] mt-0.5">{session.address}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isParticipant && session.lat && session.lng && (
            <Button variant="secondary" size="sm" onClick={openNavigation}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Rejoindre
              </span>
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Supprimer</Button>
        </div>
      </div>

      {/* Map — always visible */}
      {session.lat && session.lng && (
        <div className="mb-6">
          <MapPicker
            label="Point de rassemblement"
            lat={session.lat}
            lng={session.lng}
            address={session.address || ""}
            onAddressChange={() => {}}
            onCoordsChange={() => {}}
            readOnly
          />
        </div>
      )}

      {/* Stats — only for past/ongoing sessions */}
      {!isFuture && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center !p-4">
            <p className="text-2xl font-bold text-[var(--primary)]">{sessionInteractions.length}</p>
            <p className="text-[10px] text-[var(--outline)]">Interactions</p>
          </Card>
          <Card className="text-center !p-4">
            <p className="text-2xl font-bold text-emerald-400">{closes}</p>
            <p className="text-[10px] text-[var(--outline)]">Closes</p>
          </Card>
          <Card className="text-center !p-4">
            <p className="text-2xl font-bold text-[var(--tertiary)]">{avgFeeling}</p>
            <p className="text-[10px] text-[var(--outline)]">Ressenti moy.</p>
          </Card>
        </div>
      )}

      {/* Participants */}
      {(acceptedParticipants.length > 0 || pendingParticipants.length > 0) && canSeeParticipants && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Participants ({acceptedParticipants.length})</h2>
          <div className="space-y-2">
            {acceptedParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                {p.profile?.profilePhoto ? (
                  <img src={p.profile.profilePhoto} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-[var(--primary)]">{p.profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[var(--on-surface)] font-medium">@{p.profile?.username || p.profile?.firstName || "\u2014"}</p>
                  {p.profile?.location && <p className="text-[10px] text-[var(--outline)]">{p.profile.location}</p>}
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-400 ml-auto">Confirmé</Badge>
              </div>
            ))}
            {pendingParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-high)] flex items-center justify-center">
                  <span className="text-xs font-bold text-[var(--outline)]">{p.profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
                </div>
                <div>
                  <p className="text-sm text-[var(--on-surface-variant)]">@{p.profile?.username || p.profile?.firstName || "\u2014"}</p>
                </div>
                <Badge className="bg-amber-400/15 text-amber-400 ml-auto">En attente</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Wings (legacy text-based) */}
      {session.wings.length > 0 && acceptedParticipants.length === 0 && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-2">Wings</h2>
          <div className="flex gap-2">{session.wings.map((w) => <span key={w} className="text-xs px-3 py-1 rounded-full bg-[var(--surface-high)] text-[var(--on-surface-variant)]">{w}</span>)}</div>
        </Card>
      )}

      {/* Goals */}
      {session.goals.length > 0 && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Description et objectifs</h2>
          <div className="space-y-2">
            {session.goals.map((g, i) => (
              <button key={i} onClick={() => toggleGoal(id, i)} className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--surface-high)] transition-all">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${g.done ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--outline)]"}`}>
                  {g.done && <svg className="w-3 h-3 text-[var(--on-surface)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${g.done ? "text-[var(--on-surface-variant)] line-through" : "text-[var(--on-surface)]"}`}>{g.text}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Interactions — hidden for future sessions */}
      {!isFuture && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Interactions ({sessionInteractions.length})</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowAddInteraction(true)}>+ Interaction</Button>
          </div>
          {sessionInteractions.length === 0 ? (
            <p className="text-xs text-[var(--outline)]">Aucune interaction rattachée</p>
          ) : (
            <div className="space-y-2">
              {sessionInteractions.map((i) => (
                <Link key={i.id} href={`/interactions/${i.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-high)] transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[var(--primary)]">{i.feelingScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--on-surface)] font-medium">{i.firstName || "Anonyme"}</span>
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
      )}

      {isFuture && (
        <Card className="mb-4 !p-4">
          <p className="text-xs text-[var(--outline)] text-center">Les interactions seront disponibles une fois la session commencée.</p>
        </Card>
      )}

      {/* Notes */}
      {session.notes && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-2">Notes</h2>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed whitespace-pre-wrap">{session.notes}</p>
        </Card>
      )}

      {/* Field Report — for past sessions */}
      {isPast && (() => {
        const existingReport = journalEntries.find((e) => e.entryType === "fieldreport" && e.sessionId === id);
        return (
          <Card className="mb-4 !p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--on-surface)]">Field Report</h2>
              {!existingReport && <Button variant="secondary" size="sm" onClick={() => setShowFieldReport(true)}>Écrire</Button>}
            </div>
            {existingReport ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={existingReport.visibility === "public" ? "bg-emerald-400/15 text-emerald-400" : existingReport.visibility === "wings" ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" : "bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]"}>
                    {existingReport.visibility === "public" ? "Public" : existingReport.visibility === "wings" ? "Wings" : "Privé"}
                  </Badge>
                  <span className="text-[10px] text-[var(--outline)]">{formatDate(existingReport.date)}</span>
                </div>
                <div className="text-sm text-[var(--on-surface-variant)] leading-relaxed journal-content" dangerouslySetInnerHTML={{ __html: existingReport.content }} />
              </div>
            ) : (
              <p className="text-xs text-[var(--outline)]">Aucun field report. Raconte comment s&apos;est passée la session !</p>
            )}
          </Card>
        );
      })()}

      <Modal open={showFieldReport} onClose={() => setShowFieldReport(false)} title="Field Report">
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-high)]">
            <div
              ref={fieldReportRef}
              contentEditable
              className="min-h-[180px] max-h-[350px] overflow-y-auto px-4 py-3 text-sm text-[var(--on-surface)] focus:outline-none journal-content"
              data-placeholder="Raconte comment s'est passée la session... Tes interactions, tes ressentis, ce que tu as appris..."
              suppressContentEditableWarning
            />
          </div>
          <div>
            <p className="text-xs text-[var(--on-surface-variant)] mb-2">Partager avec</p>
            <div className="flex gap-2">
              {(["private", "wings", "public"] as Visibility[]).map((v) => (
                <button key={v} onClick={() => setFrVisibility(v)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    frVisibility === v
                      ? v === "private" ? "bg-[var(--outline-variant)]/20 text-[var(--on-surface-variant)]" : v === "wings" ? "bg-[var(--tertiary)]/20 text-[var(--tertiary)]" : "bg-emerald-400/20 text-emerald-400"
                      : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}>
                  {v === "private" ? "Privé" : v === "wings" ? "Wings" : "Public"}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => {
            const content = fieldReportRef.current?.innerHTML?.trim() || "";
            if (!content || content === "<br>") return;
            addJournalEntry(content, "review", frVisibility, "fieldreport", id, []);
            setShowFieldReport(false);
          }}>Publier le Field Report</Button>
        </div>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer la session">
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Es-tu sûr ? Les interactions ne seront pas supprimées.</p>
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
          onSubmit={async (data) => {
            const interaction = await addNewInteraction(data);
            await addInteraction(id, interaction.id);
            setShowAddInteraction(false);
          }}
        />
      </Modal>
    </div>
  );
}
