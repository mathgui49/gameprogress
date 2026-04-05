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

      {/* Badges */}
      {badges.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Badges ({badges.length})</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b: BadgeType) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-bright)] border border-[var(--border)]" title={b.description}>
                <span className="text-lg">{b.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[var(--on-surface)]">{b.name}</p>
                  <p className="text-[9px] text-[var(--outline)]">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
