"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWingRequests } from "@/hooks/useWingRequests";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MapView } from "@/components/ui/MapView";
import type { PublicProfile, Session, Post, JournalEntry } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS } from "@/types";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatDate, formatRelative, computeAge } from "@/lib/utils";
import { findProfileByUsernameAction, fetchUserPublicPostsAction, fetchUserPublicJournalAction, fetchUserGamificationAction, fetchUserLeaderboardRankAction, fetchUserBadgesAction, fetchSessionsByUserIdAction } from "@/actions/db";
import type { Badge as BadgeType } from "@/types";

const BADGE_ICON_MAP: Record<string, (size: number) => React.ReactNode> = {
  target: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  flame: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.545 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>,
  trophy: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.52.587 6.023 6.023 0 01-2.52-.587" /></svg>,
  sparkle: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  gem: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.5 5H20l-8 13-8-13h4.5L12 2z" /></svg>,
  bolt: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  crown: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 17l3.5-9 4.5 5 2-8 2 8 4.5-5L22 17H2z" /><rect x="3" y="17" width="18" height="3" rx="1" /></svg>,
  medal: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16.5 3v1.5m0 15V21m-4.5-18v18M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" /></svg>,
  calendar: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  "calendar-check": (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6l2 2 4-4" /></svg>,
  pen: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>,
  book: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  handshake: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  users: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  phone: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
  heart: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  star: (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
  "star-fill": (s) => <svg className={`w-${s} h-${s}`} style={{ width: s * 4, height: s * 4 }} fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
};

function BadgeIcon({ icon, size = 4 }: { icon: string; size?: number }) {
  const renderer = BADGE_ICON_MAP[icon];
  if (renderer) return <span className="text-[var(--primary)]">{renderer(size)}</span>;
  return <span className="text-sm text-[var(--primary)]">{icon}</span>;
}

export default function WingProfilePage() {
  const params = useParams();
  const username = decodeURIComponent(params.id as string);
  const { isWing, sendRequest, hasPendingTo } = useWingRequests();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [gam, setGam] = useState<{ xp: number; level: number; streak: number }>({ xp: 0, level: 1, streak: 0 });
  const [rank, setRank] = useState<number | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const prof = await findProfileByUsernameAction(username);
      if (!prof) { setLoaded(true); return; }
      setProfile(prof as PublicProfile);

      const uid = prof.userId;
      const wingConnected = isWing(uid);

      const [gamData, rankData, badgesData, sessData, postsData, journalData] = await Promise.all([
        fetchUserGamificationAction(uid),
        fetchUserLeaderboardRankAction(uid),
        fetchUserBadgesAction(uid),
        wingConnected ? fetchSessionsByUserIdAction(uid) : Promise.resolve([]),
        fetchUserPublicPostsAction(uid, wingConnected),
        fetchUserPublicJournalAction(uid, wingConnected),
      ]);

      setGam(gamData);
      setRank(rankData);
      setBadges(badgesData);
      setSessions(sessData);
      setPosts(postsData);
      setJournal(journalData);
      setLoaded(true);
    }
    load();
  }, [username, isWing]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  if (!profile) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto">
        <p className="text-sm text-[var(--on-surface-variant)]">Profil introuvable.</p>
        <Link href="/wings" className="text-sm text-[var(--primary)] mt-2 inline-block">← Retour</Link>
      </div>
    );
  }

  const wingConnected = isWing(profile.userId);
  const pending = hasPendingTo(profile.userId);
  const age = computeAge(profile.birthDate);
  const privacy = profile.privacy;
  const canSeeAge = age && (wingConnected ? privacy?.shareAgeWings : privacy?.shareAgePublic);
  const canSeeStats = wingConnected ? privacy?.shareStatsWings : false;
  const canSeeRanking = wingConnected ? privacy?.showInLeaderboardWings : privacy?.showInLeaderboardPublic;
  const hasMap = profile.lat && profile.lng;

  const mapMarkers = hasMap ? [{ lat: profile.lat!, lng: profile.lng!, label: profile.firstName || profile.username }] : [];

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <Link href="/wings" className="text-sm text-[var(--outline)] hover:text-[var(--primary)] transition-colors mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Wings
      </Link>

      {/* Profile header */}
      <Card className="mb-4 mt-4">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--tertiary)]/20 flex items-center justify-center overflow-hidden shrink-0">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[var(--primary)]">{profile.firstName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)]">
                {profile.firstName || profile.username}
              </h1>
              {canSeeAge && <span className="text-sm text-[var(--on-surface-variant)]">{age} ans</span>}
              {wingConnected && <Badge className="bg-emerald-400/15 text-emerald-400">Wing</Badge>}
            </div>
            <p className="text-sm text-[var(--outline)]">@{profile.username}</p>
            {profile.location && (
              <p className="text-xs text-[var(--on-surface-variant)] mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {profile.location}
              </p>
            )}
            {profile.bio && <p className="text-sm text-[var(--on-surface-variant)] mt-2">{profile.bio}</p>}
          </div>

          {/* Action */}
          <div className="shrink-0">
            {!wingConnected && !pending && (
              <Button size="sm" onClick={() => sendRequest(profile.userId)}>Inviter</Button>
            )}
            {pending && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-400 font-medium">En attente</span>
            )}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      {(canSeeRanking || canSeeStats) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {canSeeRanking && rank && (
            <Tooltip text="Position dans le classement global" position="bottom">
              <Card className="text-center !p-4 w-full">
                <p className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--primary)]">#{rank}</p>
                <p className="text-[10px] text-[var(--outline)]">Classement</p>
              </Card>
            </Tooltip>
          )}
          <Tooltip text="Niveau base sur l'XP accumule" position="bottom">
            <Card className="text-center !p-4 w-full">
              <p className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--tertiary)]">{gam.level}</p>
              <p className="text-[10px] text-[var(--outline)]">Niveau</p>
            </Card>
          </Tooltip>
          <Tooltip text="Points d'experience total" position="bottom">
            <Card className="text-center !p-4 w-full">
              <p className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--primary)]">{gam.xp}</p>
              <p className="text-[10px] text-[var(--outline)]">XP</p>
            </Card>
          </Tooltip>
          {gam.streak > 0 && (
            <Tooltip text="Jours consecutifs d'activite" position="bottom">
              <Card className="text-center !p-4 w-full">
                <p className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-amber-400">{gam.streak}</p>
                <p className="text-[10px] text-[var(--outline)]">Streak</p>
              </Card>
            </Tooltip>
          )}
        </div>
      )}

      {/* Map */}
      {hasMap && (
        <Card className="mb-4 !p-0 overflow-hidden">
          <div className="h-[200px]">
            <MapView markers={mapMarkers} />
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--on-surface-variant)]">{profile.location}</p>
          </div>
        </Card>
      )}

      {/* Sessions (wing only) */}
      {wingConnected && sessions.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Sessions ({sessions.length})
          </h2>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => (
              <Card key={s.id} className="!p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{s.title || "Session sans titre"}</p>
                  <p className="text-[10px] text-[var(--outline)]">{formatDate(s.date)}</p>
                </div>
                {s.location && <p className="text-xs text-[var(--on-surface-variant)] flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {s.location}
                </p>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--outline)]">
                  <span>{s.interactionIds?.length || 0} interaction{(s.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                  {s.isPublic && <Badge className="bg-emerald-400/15 text-emerald-400">Public</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Posts ({posts.length})
          </h2>
          <div className="space-y-2">
            {posts.map((p: any) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={p.visibility === "wings" ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" : "bg-emerald-400/15 text-emerald-400"}>
                    {p.visibility === "wings" ? "Wings" : "Public"}
                  </Badge>
                  <span className="text-[10px] text-[var(--outline)]">{formatRelative(p.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--on-surface-variant)] whitespace-pre-wrap">{p.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Journal entries */}
      {journal.length > 0 && (
        <div className="mb-4">
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-3">
            Journal ({journal.length})
          </h2>
          <div className="space-y-2">
            {journal.map((j: any) => (
              <Card key={j.id} className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  {j.tag && <Badge className={JOURNAL_TAG_COLORS[j.tag as keyof typeof JOURNAL_TAG_COLORS]}>{JOURNAL_TAG_LABELS[j.tag as keyof typeof JOURNAL_TAG_LABELS]}</Badge>}
                  <Badge className={j.visibility === "wings" ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" : "bg-emerald-400/15 text-emerald-400"}>
                    {j.visibility === "wings" ? "Wings" : "Public"}
                  </Badge>
                  <span className="text-[10px] text-[var(--outline)]">{formatRelative(j.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--on-surface-variant)] whitespace-pre-wrap line-clamp-4">{j.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Badges — at the bottom */}
      {badges.filter((b) => b.unlockedAt).length > 0 && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Badges ({badges.filter((b) => b.unlockedAt).length})</h2>
          <div className="flex flex-wrap gap-2">
            {badges.filter((b) => b.unlockedAt).map((b: BadgeType) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-bright)] border border-[var(--border)]" title={b.description}>
                <BadgeIcon icon={b.icon} size={4} />
                <div>
                  <p className="text-xs font-medium text-[var(--on-surface)]">{b.name}</p>
                  <p className="text-[9px] text-[var(--outline)]">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state for non-wings */}
      {!wingConnected && sessions.length === 0 && posts.length === 0 && journal.length === 0 && (
        <Card>
          <div className="text-center py-6">
            <svg className="w-8 h-8 mx-auto text-[var(--outline-variant)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            <p className="text-sm text-[var(--on-surface-variant)]">Deviens wing avec {profile.firstName || profile.username} pour voir plus de contenu.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
