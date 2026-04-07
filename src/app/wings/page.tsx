"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { ProfileIncompleteNotice } from "@/components/ui/ProfileIncompleteNotice";
import { useWingRequests } from "@/hooks/useWingRequests";
import { useMessages } from "@/hooks/useMessages";
import { useWingMeta } from "@/hooks/useWingMeta";
import { useWingChallenges } from "@/hooks/useWingChallenges";
import { useWingPings } from "@/hooks/useWingPings";
import { fetchProfilesByIdsAction, fetchWingStatusesAction, upsertWingStatusAction, fetchSharedSessionsAction } from "@/actions/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconUsers } from "@/components/ui/Icons";
import { MapView } from "@/components/ui/MapView";
import type { MapMarker } from "@/components/ui/MapView";
import type { PublicProfile, WingStatus, WingCategory, Message, Session } from "@/types";
import { WING_STATUS_LABELS, WING_STATUS_COLORS, WING_CATEGORY_LABELS, WING_CATEGORY_COLORS, DEFAULT_PRIVACY } from "@/types";
import { formatDate, formatRelative, computeAge } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { LimitReachedBanner } from "@/components/ui/PremiumGate";
import { FREE_LIMITS } from "@/lib/premium";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/hooks/useToast";

type Tab = "wings" | "discover" | "map" | "invitations" | "chat";

export default function WingsPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { profile: myProfile, isProfileComplete, discoverProfiles, findByUsername } = usePublicProfile();
  const {
    wingProfiles, loaded, pendingReceived, pendingSent,
    sendRequest, acceptRequest, declineRequest, isWing, hasPendingTo,
  } = useWingRequests();

  const wingUserIds = useMemo(() => wingProfiles.map((p) => p.userId), [wingProfiles]);
  const { meta, getMetaFor, setCategory, addNote, removeNote } = useWingMeta();
  const { challenges, active: activeChallenges, create: createChallenge, getChallengesWith } = useWingChallenges();
  const { pings, sendPing, respond: respondToPing } = useWingPings(wingUserIds);
  const toast = useToast();
  const {
    conversations, unreadCounts, currentMessages, totalUnread,
    openConversation, send: sendMessage, createGroup,
  } = useMessages();

  const { isPremium } = useSubscription();
  const wingAtLimit = !isPremium && wingProfiles.length >= FREE_LIMITS.maxWings;

  const [tab, setTab] = useState<Tab>("wings");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<PublicProfile | null>(null);
  const [searchError, setSearchError] = useState("");
  const [discoverResults, setDiscoverResults] = useState<PublicProfile[]>([]);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, PublicProfile>>({});

  // Wing statuses
  const [wingStatuses, setWingStatuses] = useState<Record<string, string>>({});
  const [myStatus, setMyStatus] = useState<WingStatus>("available");

  // Chat state
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingMessage, setPingMessage] = useState("Je sors ce soir, qui est chaud ?");
  const [pingLocation, setPingLocation] = useState("");
  const [pingDate, setPingDate] = useState(new Date().toISOString().split("T")[0]);

  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState<string | null>(null);

  const [showChallengeModal, setShowChallengeModal] = useState<string | null>(null);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeTarget, setChallengeTarget] = useState(10);
  const [challengeMetric, setChallengeMetric] = useState("approaches");
  const [challengeDeadline, setChallengeDeadline] = useState("");

  const [showSharedSessions, setShowSharedSessions] = useState<string | null>(null);
  const [sharedSessions, setSharedSessions] = useState<Session[]>([]);

  // Load wing statuses + pending profiles in parallel
  const pendingReceivedIds = useMemo(() => pendingReceived.map((r) => r.fromUserId).join(","), [pendingReceived]);
  const pendingSentIds = useMemo(() => pendingSent.map((r) => r.toUserId).join(","), [pendingSent]);

  // Poll wing statuses every 30s
  useEffect(() => {
    if (wingUserIds.length === 0) return;
    const fetchStatuses = () => fetchWingStatusesAction(wingUserIds).then(setWingStatuses);
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [wingUserIds.join(",")]);

  // Fetch pending profiles
  useEffect(() => {
    const allIds = [...new Set([
      ...pendingReceivedIds.split(",").filter(Boolean),
      ...pendingSentIds.split(",").filter(Boolean),
    ])].filter((id) => !pendingProfiles[id]);
    if (allIds.length > 0) {
      fetchProfilesByIdsAction(allIds).then((profiles) => {
        const map: Record<string, PublicProfile> = { ...pendingProfiles };
        profiles.forEach((p: PublicProfile) => { map[p.userId] = p; });
        setPendingProfiles(map);
      });
    }
  }, [pendingReceivedIds, pendingSentIds]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSearchUsername = async () => {
    if (!searchUsername.trim()) return;
    setSearchError(""); setSearchResult(null);
    const profile = await findByUsername(searchUsername.trim().toLowerCase());
    if (!profile) setSearchError("Aucun utilisateur trouvé avec ce nom.");
    else setSearchResult(profile);
  };

  const handleDiscover = async () => {
    const results = await discoverProfiles(discoverSearch || undefined);
    setDiscoverResults(results);
    setDiscoverLoaded(true);
  };

  const handleStatusChange = async (status: WingStatus) => {
    setMyStatus(status);
    await upsertWingStatusAction(status);
  };

  const handleSendPing = async () => {
    await sendPing(pingMessage, pingLocation, new Date(pingDate).toISOString());
    setShowPingModal(false);
    setPingMessage("Je sors ce soir, qui est chaud ?");
    setPingLocation(""); setPingDate(new Date().toISOString().split("T")[0]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatWith) return;
    await sendMessage(chatWith, null, chatInput);
    setChatInput("");
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !showNoteModal) return;
    await addNote(showNoteModal, noteInput);
    setNoteInput(""); setShowNoteModal(null);
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim() || !showChallengeModal || !challengeDeadline) return;
    const targetId = showChallengeModal;
    const id = await createChallenge({
      targetUserId: targetId,
      title: challengeTitle,
      description: "",
      target: challengeTarget,
      metric: challengeMetric,
      deadline: new Date(challengeDeadline).toISOString(),
    });
    if (id) {
      // Send an automatic message to notify the wing
      const wingName = wingProfiles.find((w) => w.userId === targetId)?.firstName || "ton wing";
      await sendMessage(targetId, null, `Je te lance un défi : "${challengeTitle}" — ${challengeTarget} ${challengeMetric === "approaches" ? "approches" : challengeMetric === "closes" ? "closes" : challengeMetric === "sessions" ? "sessions" : challengeMetric}. Tu relèves ?`);
      toast.show(`Défi envoyé à ${wingName} !`, "success");
    } else {
      toast.show("Erreur lors de la création du défi", "error");
    }
    setChallengeTitle(""); setChallengeTarget(10);
    setChallengeMetric("approaches"); setChallengeDeadline("");
    setShowChallengeModal(null);
  };

  const handleShowSharedSessions = async (wingUserId: string) => {
    const sessions = await fetchSharedSessionsAction(wingUserId);
    setSharedSessions(sessions);
    setShowSharedSessions(wingUserId);
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  if (!isProfileComplete) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#818cf8] to-[#34d399] bg-clip-text text-transparent animate-gradient-text">Wings</span></h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Tes partenaires de game</p>
        </div>
        <ProfileIncompleteNotice />
      </div>
    );
  }

  // Build map markers
  const mapMarkers: MapMarker[] = [
    ...wingProfiles
      .filter((p) => p.lat && p.lng)
      .map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.firstName || p.username, sublabel: `@${p.username}`, isWing: true })),
    ...discoverResults
      .filter((p) => p.lat && p.lng && !isWing(p.userId))
      .map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.firstName || p.username, sublabel: `@${p.username} · ${p.location}` })),
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "wings", label: "Mes Wings", count: wingProfiles.length },
    { key: "chat", label: "Chat", count: totalUnread || undefined },
    { key: "discover", label: "Découvrir" },
    { key: "map", label: "Carte" },
    { key: "invitations", label: "Invitations", count: pendingReceived.length },
  ];

  const chatPartnerProfile = chatWith ? wingProfiles.find((p) => p.userId === chatWith) : null;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#818cf8] to-[#34d399] bg-clip-text text-transparent animate-gradient-text">Wings</span></h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Tes partenaires de game{!isPremium ? ` (${wingProfiles.length}/${FREE_LIMITS.maxWings})` : ""}</p>
          </div>
        </div>
        {/* Limit banner for free users */}
        {!isPremium && (
          <div className="mb-3">
            <LimitReachedBanner current={wingProfiles.length} limit={FREE_LIMITS.maxWings} itemName="wings" />
          </div>
        )}
        <div className="flex items-center gap-3">
          {/* My status indicator */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <select
              value={myStatus}
              onChange={(e) => handleStatusChange(e.target.value as WingStatus)}
              className="text-xs bg-[var(--surface-low)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--on-surface)]"
            >
              {(Object.keys(WING_STATUS_LABELS) as WingStatus[]).map((s) => (
                <option key={s} value={s}>{WING_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${WING_STATUS_COLORS[myStatus]}`} />
          </div>
          {/* Ping button */}
          <Button size="sm" className="shrink-0 whitespace-nowrap" onClick={() => setShowPingModal(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            Je sors !
          </Button>
        </div>
      </div>

      {/* Active pings banner */}
      {pings.length > 0 && (
        <div className="space-y-2 mb-4">
          {pings.slice(0, 3).map((ping) => {
            const profile = wingProfiles.find((p) => p.userId === ping.fromUserId);
            const isMine = ping.fromUserId === userId;
            return (
              <Card key={ping.id} className="!p-3 !border-[var(--primary)]/20 bg-[var(--primary)]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--primary)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                    <div>
                      <p className="text-xs font-medium text-[var(--on-surface)]">
                        <span className="text-[var(--primary)]">{isMine ? "Toi" : (profile?.firstName || "Wing")}</span> — {ping.message}
                      </p>
                      <p className="text-[10px] text-[var(--outline)]">
                        {ping.location && `${ping.location} · `}{formatRelative(ping.createdAt)}
                        {ping.respondedIds.length > 0 && ` · ${ping.respondedIds.length} réponse${ping.respondedIds.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  {!isMine && !ping.respondedIds.includes(userId) && (
                    <Button size="sm" onClick={() => respondToPing(ping.id)}>Je viens !</Button>
                  )}
                  {ping.respondedIds.includes(userId) && (
                    <Badge className="bg-emerald-400/15 text-emerald-400">Confirmé</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key !== "chat") setChatWith(null); }}
            className={`shrink-0 text-xs font-medium px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--outline)] hover:text-[var(--on-surface-variant)] bg-[var(--surface-low)]"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-[var(--primary)]/20" : "bg-[var(--outline-variant)]"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Mes Wings */}
      {tab === "wings" && (
        <>
          {!myProfile?.username && (
            <Card className="mb-4 !border-amber-400/20">
              <p className="text-sm text-amber-400 mb-2">Configure ton profil public d&apos;abord</p>
              <p className="text-xs text-[var(--on-surface-variant)] mb-3">Va dans Paramètres pour créer ton nom d&apos;utilisateur et rendre ton profil visible.</p>
              <Link href="/settings"><Button size="sm">Aller aux paramètres</Button></Link>
            </Card>
          )}

          {wingProfiles.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={28} />}
              title="Aucun wing"
              description="Cherche des partenaires dans l'onglet Découvrir ou invite quelqu'un avec son nom d'utilisateur."
              action={<Button onClick={() => setTab("discover")}>Découvrir</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wingProfiles.map((wing, idx) => {
                const status = wingStatuses[wing.userId] as WingStatus || "offline";
                const wingMeta = getMetaFor(wing.userId);
                const wingChallenges = getChallengesWith(wing.userId).filter((c) => c.status === "active");
                return (
                  <div key={wing.userId} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <Card hover className="!p-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/wings/${encodeURIComponent(wing.username)}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="md" />
                            {/* Status dot */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[status]}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-[var(--on-surface)] truncate">{wing.firstName || wing.username}</p>
                              {wingMeta?.category && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${WING_CATEGORY_COLORS[wingMeta.category]}`}>
                                  {WING_CATEGORY_LABELS[wingMeta.category]}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--outline)]">@{wing.username}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {wing.location && <p className="text-[10px] text-[var(--on-surface-variant)]">{wing.location}</p>}
                              {wingMeta && wingMeta.sharedSessionStreak > 0 && (
                                <span className="text-[10px] text-amber-400">🔥 {wingMeta.sharedSessionStreak}j streak</span>
                              )}
                            </div>
                          </div>
                        </Link>
                        {/* Quick actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {unreadCounts[wing.userId] ? (
                            <button onClick={() => { setTab("chat"); setChatWith(wing.userId); openConversation(wing.userId); }}
                              className="relative p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--primary)]">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[8px] flex items-center justify-center">{unreadCounts[wing.userId]}</span>
                            </button>
                          ) : (
                            <button onClick={() => { setTab("chat"); setChatWith(wing.userId); openConversation(wing.userId); }}
                              className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)]">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                            </button>
                          )}
                          <button onClick={() => setShowNoteModal(wing.userId)} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)]" title="Notes privées">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                          </button>
                          <button onClick={() => setShowCategoryModal(wing.userId)} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)]" title="Catégorie">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                          </button>
                          <button onClick={() => handleShowSharedSessions(wing.userId)} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)]" title="Sessions partagées">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                          </button>
                          <button onClick={() => setShowChallengeModal(wing.userId)} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)]" title="Défier">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                          </button>
                        </div>
                      </div>
                      {/* Active challenges preview */}
                      {wingChallenges.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--border)]">
                          {wingChallenges.slice(0, 1).map((c) => (
                            <div key={c.id} className="flex items-center gap-2 text-[10px]">
                              <span className="text-[var(--primary)] font-medium">Défi:</span>
                              <span className="text-[var(--on-surface-variant)] truncate">{c.title}</span>
                              <span className="text-[var(--outline)]">({c.currentCreator}/{c.target} vs {c.currentTarget}/{c.target})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Notes preview */}
                      {wingMeta && wingMeta.notes.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-[var(--outline)] italic truncate">
                          📝 {wingMeta.notes[wingMeta.notes.length - 1].content}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB: Chat */}
      {tab === "chat" && (
        <>
          {!chatWith ? (
            // Conversation list
            <div className="space-y-2">
              {wingProfiles.length === 0 ? (
                <EmptyState icon={<IconUsers size={28} />} title="Aucune conversation" description="Ajoute des wings pour commencer à discuter." />
              ) : (
                wingProfiles.map((wing) => {
                  const lastConvo = conversations.find((c) => c.partnerId === wing.userId);
                  const unread = unreadCounts[wing.userId] || 0;
                  return (
                    <button key={wing.userId} onClick={() => { setChatWith(wing.userId); openConversation(wing.userId); }}
                      className="w-full text-left">
                      <Card hover className="!p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="md" />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[(wingStatuses[wing.userId] as WingStatus) || "offline"]}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-[var(--on-surface)]">{wing.firstName || wing.username}</p>
                              {lastConvo && <span className="text-[10px] text-[var(--outline)]">{formatRelative(lastConvo.lastMessage.createdAt)}</span>}
                            </div>
                            {lastConvo && (
                              <p className="text-xs text-[var(--on-surface-variant)] truncate">{lastConvo.lastMessage.content}</p>
                            )}
                          </div>
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-medium">{unread}</span>
                          )}
                        </div>
                      </Card>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // Chat view
            <div className="flex flex-col h-[calc(100vh-280px)]">
              {/* Chat header */}
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setChatWith(null)} className="p-1 text-[var(--outline)] hover:text-[var(--on-surface)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div className="relative">
                  <Avatar src={chatPartnerProfile?.profilePhoto} name={chatPartnerProfile?.firstName || chatPartnerProfile?.username} size="sm" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[(wingStatuses[chatWith] as WingStatus) || "offline"]}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{chatPartnerProfile?.firstName || chatPartnerProfile?.username}</p>
                  <p className="text-[10px] text-[var(--outline)]">{WING_STATUS_LABELS[(wingStatuses[chatWith] as WingStatus) || "offline"]}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-2 px-1 mb-3">
                {[...currentMessages].reverse().map((msg) => {
                  const isMe = msg.fromUserId === userId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? "bg-[var(--primary)] text-white rounded-br-md"
                          : "bg-[var(--surface-high)] text-[var(--on-surface)] rounded-bl-md"
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[9px] mt-1 ${isMe ? "text-white/60" : "text-[var(--outline)]"}`}>{formatRelative(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Message..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: Découvrir */}
      {tab === "discover" && (
        <>
          <Card className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Chercher par nom d&apos;utilisateur</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input placeholder="@nom_utilisateur" value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchUsername()} />
              </div>
              <Button size="sm" onClick={handleSearchUsername}>Chercher</Button>
            </div>
            {searchError && <p className="text-xs text-[#fb7185] mt-2">{searchError}</p>}
            {searchResult && (
              <div className="mt-3 p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
                <ProfileCard profile={searchResult} isWing={isWing(searchResult.userId)} hasPending={hasPendingTo(searchResult.userId)} onInvite={() => sendRequest(searchResult.userId)} />
              </div>
            )}
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Profils à proximité</h3>
            <div className="flex gap-2 mb-4">
              <div className="flex-1"><Input placeholder="Filtrer par ville..." value={discoverSearch} onChange={(e) => setDiscoverSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleDiscover()} /></div>
              <Button size="sm" onClick={handleDiscover}>Explorer</Button>
            </div>
            {discoverLoaded && discoverResults.length === 0 && (
              <p className="text-xs text-[var(--outline)] text-center py-4">Aucun profil public trouvé{discoverSearch ? ` pour "${discoverSearch}"` : ""}.</p>
            )}
            <div className="space-y-2">
              {discoverResults.map((p) => (
                <div key={p.userId} className="p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
                  <ProfileCard profile={p} isWing={isWing(p.userId)} hasPending={hasPendingTo(p.userId)} onInvite={() => sendRequest(p.userId)} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* TAB: Carte */}
      {tab === "map" && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Communauté sur la carte</h3>
          <p className="text-xs text-[var(--on-surface-variant)] mb-4">Tes wings et les membres publics de la communauté.</p>
          {!discoverLoaded && (
            <div className="mb-3">
              <Button size="sm" onClick={async () => { const results = await discoverProfiles(); setDiscoverResults(results); setDiscoverLoaded(true); }}>Charger les profils publics</Button>
            </div>
          )}
          <div className="h-[400px] rounded-xl overflow-hidden border border-[var(--border)]">
            <MapView markers={mapMarkers} center={myProfile?.lat && myProfile?.lng ? [myProfile.lat, myProfile.lng] : undefined} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" /><span className="text-[10px] text-[var(--on-surface-variant)]">Wings ({wingProfiles.filter((p) => p.lat && p.lng).length})</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[var(--tertiary)]" /><span className="text-[10px] text-[var(--on-surface-variant)]">Communauté ({discoverResults.filter((p) => p.lat && p.lng && !isWing(p.userId)).length})</span></div>
          </div>
        </Card>
      )}

      {/* TAB: Invitations */}
      {tab === "invitations" && (
        <>
          <Card className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">
              Reçues
              {pendingReceived.length > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">{pendingReceived.length}</span>}
            </h3>
            {pendingReceived.length === 0 ? (
              <p className="text-xs text-[var(--outline)]">Aucune invitation en attente.</p>
            ) : (
              <div className="space-y-2">
                {pendingReceived.map((req) => {
                  const p = pendingProfiles[req.fromUserId];
                  const age = computeAge(p?.birthDate);
                  const pPrivacy = { ...DEFAULT_PRIVACY, ...p?.privacy };
                  const showAge = pPrivacy.shareAgePublic || pPrivacy.shareAgeWings;
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <Avatar src={p?.profilePhoto} name={p?.firstName} size="sm" />
                        <div>
                          <p className="text-sm text-[var(--on-surface)]">{p?.firstName || "—"}{age && showAge ? <span className="text-[var(--outline)] ml-1">{age} ans</span> : ""}</p>
                          <p className="text-[10px] text-[var(--outline)]">@{p?.username || "—"} · {formatDate(req.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => acceptRequest(req.id)}>Accepter</Button>
                        <Button size="sm" variant="ghost" onClick={() => declineRequest(req.id)}>Refuser</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Envoyées</h3>
            {pendingSent.length === 0 ? (
              <p className="text-xs text-[var(--outline)]">Aucune invitation envoyée en attente.</p>
            ) : (
              <div className="space-y-2">
                {pendingSent.map((req) => {
                  const p = pendingProfiles[req.toUserId];
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <Avatar src={p?.profilePhoto} name={p?.firstName} size="sm" />
                        <div>
                          <p className="text-sm text-[var(--on-surface)]">{p?.firstName || "—"}</p>
                          <p className="text-[10px] text-[var(--outline)]">@{p?.username || "—"} · {formatDate(req.createdAt)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-400/15 text-amber-400">En attente</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ─── MODALS ─────────────────────────────────────── */}

      {/* Ping Modal */}
      <Modal open={showPingModal} onClose={() => setShowPingModal(false)} title="Je sors ce soir !">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Envoie un ping à tous tes wings pour leur dire que tu sors.</p>
          <Input value={pingMessage} onChange={(e) => setPingMessage(e.target.value)} placeholder="Message..." />
          <Input value={pingLocation} onChange={(e) => setPingLocation(e.target.value)} placeholder="Lieu / quartier..." />
          <Input type="date" value={pingDate} onChange={(e) => setPingDate(e.target.value)} />
          <Button onClick={handleSendPing}>Envoyer le ping</Button>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal open={!!showNoteModal} onClose={() => { setShowNoteModal(null); setNoteInput(""); }} title="Notes privées">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Ces notes ne sont visibles que par toi.</p>
          {showNoteModal && getMetaFor(showNoteModal)?.notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between p-2 rounded-lg bg-[var(--surface-low)]">
              <p className="text-xs text-[var(--on-surface-variant)] flex-1">{note.content}</p>
              <button onClick={() => removeNote(showNoteModal, note.id)} className="text-[var(--outline)] hover:text-[#fb7185] ml-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Ajouter une note..." onKeyDown={(e) => e.key === "Enter" && handleAddNote()} className="flex-1" />
            <Button size="sm" onClick={handleAddNote}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={!!showCategoryModal} onClose={() => setShowCategoryModal(null)} title="Catégorie">
        <div className="space-y-2">
          <p className="text-xs text-[var(--on-surface-variant)] mb-3">Classe ce wing pour mieux organiser ta liste.</p>
          {(["favorite", "regular", "occasional"] as WingCategory[]).map((cat) => (
            <button key={cat} onClick={() => { if (showCategoryModal) setCategory(showCategoryModal, cat); setShowCategoryModal(null); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                showCategoryModal && getMetaFor(showCategoryModal)?.category === cat
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] hover:bg-[var(--surface-bright)]"
              }`}>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${WING_CATEGORY_COLORS[cat]}`}>{WING_CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
          <button onClick={() => { if (showCategoryModal) setCategory(showCategoryModal, null); setShowCategoryModal(null); }}
            className="w-full text-xs text-[var(--outline)] py-2 hover:text-[var(--on-surface-variant)]">
            Aucune catégorie
          </button>
        </div>
      </Modal>

      {/* Challenge Modal */}
      <Modal open={!!showChallengeModal} onClose={() => setShowChallengeModal(null)} title="Nouveau défi">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Lance un défi à ton wing !</p>
          <Input value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} placeholder="Ex: Premier à 10 approches" />
          <div className="flex gap-2">
            <select value={challengeMetric} onChange={(e) => setChallengeMetric(e.target.value)}
              className="flex-1 text-xs bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--on-surface)]">
              <option value="approaches">Approches</option>
              <option value="closes">Closes</option>
              <option value="sessions">Sessions</option>
              <option value="custom">Personnalisé</option>
            </select>
            <Input type="number" value={challengeTarget} onChange={(e) => setChallengeTarget(parseInt(e.target.value) || 1)} className="w-20" />
          </div>
          <Input type="date" value={challengeDeadline} onChange={(e) => setChallengeDeadline(e.target.value)} />
          <Button onClick={handleCreateChallenge}>Lancer le défi</Button>
        </div>
      </Modal>

      {/* Shared Sessions Modal */}
      <Modal open={!!showSharedSessions} onClose={() => { setShowSharedSessions(null); setSharedSessions([]); }} title="Sessions partagées">
        {sharedSessions.length === 0 ? (
          <p className="text-xs text-[var(--outline)] text-center py-4">Aucune session en commun.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <p className="text-xs text-[var(--on-surface-variant)] mb-2">{sharedSessions.length} session{sharedSessions.length > 1 ? "s" : ""} ensemble</p>
            {sharedSessions.map((s: Session) => (
              <Card key={s.id} className="!p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--on-surface)]">{s.title || "Session"}</p>
                    <p className="text-[10px] text-[var(--outline)]">{formatDate(s.date)}{s.location ? ` · ${s.location}` : ""}</p>
                  </div>
                  <span className="text-[10px] text-[var(--outline)]">{s.interactionIds?.length || 0} approche{(s.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProfileCard({ profile, isWing, hasPending, onInvite }: {
  profile: PublicProfile;
  isWing: boolean;
  hasPending: boolean;
  onInvite: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={profile.profilePhoto} name={profile.firstName || profile.username} size="md" />
          <div>
            <p className="text-sm font-medium text-[var(--on-surface)]">{profile.firstName || profile.username}</p>
            <p className="text-[10px] text-[var(--outline)]">@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>
          </div>
        </div>
        {isWing ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-400">Wing</span>
        ) : hasPending ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-400/15 text-amber-400">En attente</span>
        ) : (
          <Button size="sm" onClick={onInvite}>Inviter</Button>
        )}
      </div>
      {profile.bio && <p className="text-xs text-[var(--on-surface-variant)] mt-2 ml-12">{profile.bio}</p>}
    </div>
  );
}
