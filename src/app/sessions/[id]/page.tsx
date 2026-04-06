"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSessions } from "@/hooks/useSessions";
import { useInteractions } from "@/hooks/useInteractions";
import { useWingRequests } from "@/hooks/useWingRequests";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { ProfileIncompleteNotice } from "@/components/ui/ProfileIncompleteNotice";
import { useJournal } from "@/hooks/useJournal";
import {
  fetchSessionParticipantsWithProfilesAction,
  fetchSessionCommentsAction,
  addSessionCommentAction,
  joinPublicSessionAction,
  leaveSessionAction,
} from "@/actions/db";
import { APPROACH_LABELS, RESULT_LABELS, RESULT_COLORS, TYPE_COLORS } from "@/types";
import type { Visibility, SessionComment } from "@/types";
import { formatDate, formatRelative } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
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

function ActiveTimer({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const start = new Date(date).getTime();
  const diff = now - start;
  if (diff < 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
      <span className="text-sm font-mono text-emerald-400 tabular-nums font-semibold">
        {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

function CountdownTimer({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const target = new Date(date).getTime();
  const diff = target - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (h >= 24) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-cyan-400 tabular-nums font-semibold">
        {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-[var(--outline)]">avant le debut</span>
    </div>
  );
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.email ?? "";
  const { getById, toggleGoal, addInteraction, remove, update, loaded } = useSessions();
  const { interactions, add: addNewInteraction } = useInteractions();
  const { isWing } = useWingRequests();
  const { isProfileComplete } = usePublicProfile();
  const { entries: journalEntries, add: addJournalEntry } = useJournal();
  const [showDelete, setShowDelete] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editMaxParticipants, setEditMaxParticipants] = useState(0);
  const [showFieldReport, setShowFieldReport] = useState(false);
  const [frVisibility, setFrVisibility] = useState<Visibility>("private");
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [comments, setComments] = useState<(SessionComment & { profile?: any })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fieldReportRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const commentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reloadParticipants = useCallback(() => {
    fetchSessionParticipantsWithProfilesAction(id).then(setParticipants);
  }, [id]);

  const reloadComments = useCallback(() => {
    fetchSessionCommentsAction(id).then((c) => setComments(c));
  }, [id]);

  useEffect(() => {
    reloadParticipants();
    reloadComments();
    // Poll comments every 15s for live chat
    commentPollRef.current = setInterval(reloadComments, 15_000);
    return () => { if (commentPollRef.current) clearInterval(commentPollRef.current); };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const session = getById(id);
  if (!session) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-[var(--on-surface-variant)] mb-4">Session introuvable</p><Button variant="secondary" onClick={() => router.push("/sessions")}>Retour</Button></div>;

  const sessionTime = new Date(session.date).getTime();
  const now = Date.now();
  const isFuture = sessionTime > now;
  // Session is past if manually ended, or if estimated duration + 1h buffer has passed, or fallback 4h
  const autoEndTime = session.estimatedDuration
    ? sessionTime + (session.estimatedDuration + 60) * 60 * 1000
    : sessionTime + 4 * 3600 * 1000;
  const isPast = !!session.endedAt || (!isFuture && now > autoEndTime);
  const isActive = !isFuture && !isPast;
  const isSameDay = isFuture && new Date(session.date).toDateString() === new Date().toDateString();
  const sessionInteractions = interactions.filter((i) => session.interactionIds.includes(i.id));
  const closes = sessionInteractions.filter((i) => i.result === "close").length;
  const avgFeeling = sessionInteractions.length > 0
    ? (sessionInteractions.reduce((s, i) => s + i.feelingScore, 0) / sessionInteractions.length).toFixed(1) : "\u2014";

  const acceptedParticipants = participants.filter((p) => p.status === "accepted");
  const pendingParticipants = participants.filter((p) => p.status === "pending");
  const isOwner = participants.length === 0 || participants.some((p) => p.ownerUserId === currentUserId && p.userId === currentUserId);
  const isParticipant = acceptedParticipants.some((p) => p.userId === currentUserId) || isOwner;
  const canSeeParticipants = session.isPublic || isWing(session.wings?.[0] || "") || isOwner;
  const placesUsed = acceptedParticipants.length;
  const placesLeft = session.maxParticipants > 0 ? session.maxParticipants - placesUsed : null;
  const isFull = placesLeft !== null && placesLeft <= 0;

  const openNavigation = () => {
    if (session.lat && session.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${session.lat},${session.lng}`, "_blank");
    }
  };

  const handleShare = async () => {
    const text = `${session.title || "Session"} — ${formatDate(session.date)}${session.location ? ` · ${session.location}` : ""}`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: session.title || "Session GameProgress", text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Lien copie !");
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinPublicSessionAction(id);
      reloadParticipants();
    } finally { setJoining(false); }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveSessionAction(id);
      reloadParticipants();
    } finally { setLeaving(false); }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      await addSessionCommentAction(id, newComment.trim());
      setNewComment("");
      reloadComments();
    } finally { setSendingComment(false); }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => router.push("/sessions")} className="flex items-center gap-1 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Sessions
      </button>

      {/* Active timer banner */}
      {isActive && (
        <Card className="mb-4 !p-4 border-emerald-400/30 bg-emerald-400/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Session en cours</p>
              <ActiveTimer date={session.date} />
            </div>
            {isOwner && (
              <Button size="sm" variant="secondary" onClick={() => update(session.id, { endedAt: new Date().toISOString() })}>
                Session terminée
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Countdown banner for same-day */}
      {isSameDay && (
        <Card className="mb-4 !p-4 border-cyan-400/20 bg-cyan-400/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">Commence bientot</p>
            <CountdownTimer date={session.date} />
          </div>
        </Card>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold text-[var(--on-surface)]">{session.title || "Session"}</h1>
          {session.isPublic && <Badge className="bg-emerald-400/15 text-emerald-400">Publique</Badge>}
          {isActive && <Badge className="bg-emerald-400/15 text-emerald-400">En cours</Badge>}
          {isFuture && !isActive && <Badge className="bg-cyan-400/15 text-cyan-400">Planifiee</Badge>}
          {isPast && <Badge className="bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]">Terminée</Badge>}
        </div>
        <p className="text-sm text-[var(--on-surface-variant)]">
          {formatDate(session.date)} {session.location && `\u00b7 ${session.location}`}
          {session.estimatedDuration && ` \u00b7 ${Math.floor(session.estimatedDuration / 60) > 0 ? `${Math.floor(session.estimatedDuration / 60)}h` : ""}${session.estimatedDuration % 60 > 0 ? `${String(session.estimatedDuration % 60).padStart(2, "0")}min` : ""}`}
        </p>
        {session.address && <p className="text-xs text-[var(--outline)] mt-0.5">{session.address}</p>}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {/* Share */}
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-[var(--surface-high)] transition-all text-[var(--on-surface-variant)] hover:text-[var(--primary)]" title="Partager">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
          </button>
          {isParticipant && session.lat && session.lng && (
            <Button variant="secondary" size="sm" onClick={openNavigation}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                S&apos;y rendre
              </span>
            </Button>
          )}
          {isOwner && <Button variant="secondary" size="sm" onClick={() => { setEditTitle(session.title || ""); setEditLocation(session.location || ""); setEditNotes(session.notes || ""); setEditDate(new Date(session.date).toISOString().slice(0, 16)); setEditIsPublic(session.isPublic); setEditMaxParticipants(session.maxParticipants); setEditing(true); }}>Modifier</Button>}
          {isOwner && <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Supprimer</Button>}
        </div>
      </div>

      {/* RSVP for public sessions — join / leave */}
      {session.isPublic && !isOwner && (
        <Card className="mb-4 !p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--on-surface)]">
                {isParticipant ? "Tu participes a cette session" : "Session publique"}
              </p>
              <p className="text-xs text-[var(--outline)] mt-0.5">
                {placesUsed} participant{placesUsed > 1 ? "s" : ""}
                {placesLeft !== null && ` · ${placesLeft} place${placesLeft > 1 ? "s" : ""} restante${placesLeft > 1 ? "s" : ""}`}
                {isFull && !isParticipant && " · Complet"}
              </p>
            </div>
            {isParticipant ? (
              <Button variant="ghost" size="sm" onClick={handleLeave} disabled={leaving}>
                {leaving ? "..." : "Quitter"}
              </Button>
            ) : isProfileComplete ? (
              <Button size="sm" onClick={handleJoin} disabled={joining || isFull}>
                {joining ? "..." : isFull ? "Complet" : "Rejoindre"}
              </Button>
            ) : null}
          </div>
          {!isProfileComplete && !isParticipant && <div className="mt-3"><ProfileIncompleteNotice /></div>}
        </Card>
      )}

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
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">
            Participants ({acceptedParticipants.length})
            {placesLeft !== null && <span className="text-[10px] text-[var(--outline)] font-normal ml-2">· {placesLeft} place{placesLeft > 1 ? "s" : ""} restante{placesLeft > 1 ? "s" : ""}</span>}
          </h2>
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
                <Badge className="bg-emerald-400/15 text-emerald-400 ml-auto">Confirme</Badge>
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
            <p className="text-xs text-[var(--outline)]">Aucune interaction rattachee</p>
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
          <p className="text-xs text-[var(--outline)] text-center">Les interactions seront disponibles une fois la session commencee.</p>
        </Card>
      )}

      {/* Chat — participants only */}
      {isParticipant && (
        <Card className="mb-4 !p-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Discussion
            <span className="text-[10px] text-[var(--outline)] font-normal">· participants uniquement</span>
          </h2>

          {/* Messages */}
          <div className="max-h-[300px] overflow-y-auto space-y-3 mb-3 no-scrollbar">
            {comments.length === 0 && (
              <p className="text-xs text-[var(--outline)] text-center py-4">Aucun message. Commence la discussion !</p>
            )}
            {comments.map((c: any) => {
              const isMe = c.userId === currentUserId;
              return (
                <div key={c.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold ${isMe ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--outline)]"}`}>
                    {c.profile?.firstName?.[0]?.toUpperCase() || c.userId?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-[var(--primary)]/15 text-[var(--on-surface)] rounded-br-md" : "bg-[var(--surface-high)] text-[var(--on-surface)] rounded-bl-md"}`}>
                      {c.content}
                    </div>
                    <p className="text-[9px] text-[var(--outline)] mt-0.5 px-1">
                      {!isMe && <span className="font-medium">@{c.profile?.username || c.userId?.slice(0, 8)} · </span>}
                      {formatRelative(c.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder="Ecris un message..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--primary)]/30 transition-colors"
            />
            <Button size="sm" onClick={handleSendComment} disabled={sendingComment || !newComment.trim()}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </Button>
          </div>
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
              {!existingReport && <Button variant="secondary" size="sm" onClick={() => setShowFieldReport(true)}>Ecrire</Button>}
            </div>
            {existingReport ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={existingReport.visibility === "public" ? "bg-emerald-400/15 text-emerald-400" : existingReport.visibility === "wings" ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" : "bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)]"}>
                    {existingReport.visibility === "public" ? "Public" : existingReport.visibility === "wings" ? "Wings" : "Prive"}
                  </Badge>
                  <span className="text-[10px] text-[var(--outline)]">{formatDate(existingReport.date)}</span>
                </div>
                <div className="text-sm text-[var(--on-surface-variant)] leading-relaxed journal-content" dangerouslySetInnerHTML={{ __html: existingReport.content }} />
              </div>
            ) : (
              <p className="text-xs text-[var(--outline)]">Aucun field report. Raconte comment s&apos;est passee la session !</p>
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
              data-placeholder="Raconte comment s'est passee la session... Tes interactions, tes ressentis, ce que tu as appris..."
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
                      ? v === "private" ? "bg-[var(--on-surface)]/15 text-[var(--on-surface)] font-medium ring-1 ring-[var(--on-surface)]/20" : v === "wings" ? "bg-[var(--tertiary)]/20 text-[var(--tertiary)] font-medium ring-1 ring-[var(--tertiary)]/30" : "bg-emerald-400/20 text-emerald-400 font-medium ring-1 ring-emerald-400/30"
                      : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
                  }`}>
                  {v === "private" ? "Prive" : v === "wings" ? "Wings" : "Public"}
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

      {/* Edit session modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier la session">
        <form onSubmit={async (e) => { e.preventDefault(); await update(id, { title: editTitle, location: editLocation, notes: editNotes, date: new Date(editDate).toISOString(), isPublic: editIsPublic, maxParticipants: editMaxParticipants }); setEditing(false); }} className="space-y-4">
          <Input label="Titre" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre de la session" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <Input label="Lieu" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Lieu" />
          </div>
          <TextArea label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes..." rows={3} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--on-surface)] font-medium">Session publique</p>
              <p className="text-[10px] text-[var(--outline)]">Visible par tous</p>
            </div>
            <button type="button" onClick={() => setEditIsPublic(!editIsPublic)} className={`relative w-11 h-6 rounded-full transition-colors ${editIsPublic ? "bg-[var(--primary)]" : "bg-[var(--outline-variant)]"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${editIsPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {editIsPublic && (
            <Input label="Places max (0 = illimite)" type="number" min={0} value={String(editMaxParticipants)} onChange={(e) => setEditMaxParticipants(Number(e.target.value))} />
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">Enregistrer</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer la session">
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">Es-tu sur ? Les interactions ne seront pas supprimees.</p>
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
