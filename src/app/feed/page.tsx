"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchActivityFeedAction, toggleSessionLikeAction, fetchSessionCommentsAction, addSessionCommentAction, fetchProfilesByIdsAction } from "@/actions/db";
import { formatRelative } from "@/lib/utils";
import { useWingRequests } from "@/hooks/useWingRequests";
import type { PublicProfile, SessionComment, JournalEntry } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS } from "@/types";

interface FeedItem {
  type: "session" | "journal" | "post";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  profile: PublicProfile | null;
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
}

export default function FeedPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { wingProfiles } = useWingRequests();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<(SessionComment & { profile?: PublicProfile })[]>([]);
  const [newComment, setNewComment] = useState("");

  const wingIds = wingProfiles.map((w) => w.userId);

  const loadFeed = async (city?: string) => {
    if (!userId) return;
    const data = await fetchActivityFeedAction(wingIds, city) as FeedItem[];
    setFeed(data);
    setLoaded(true);
  };

  useEffect(() => { if (userId) loadFeed(); }, [userId, wingProfiles.length]);

  const handleLike = async (sessionId: string) => {
    await toggleSessionLikeAction(sessionId);
    loadFeed(cityFilter || undefined);
  };

  const openComments = async (sessionId: string) => {
    if (expandedComments === sessionId) { setExpandedComments(null); return; }
    setExpandedComments(sessionId);
    const data = await fetchSessionCommentsAction(sessionId);
    const commenterIds = [...new Set(data.map((c: any) => c.userId))];
    const profiles = await fetchProfilesByIdsAction(commenterIds);
    const profileMap: Record<string, PublicProfile> = {};
    profiles.forEach((p: PublicProfile) => { profileMap[p.userId] = p; });
    setComments(data.map((c: any) => ({ ...c, profile: profileMap[c.userId] })));
  };

  const handleComment = async (sessionId: string) => {
    if (!newComment.trim()) return;
    await addSessionCommentAction(sessionId, newComment.trim());
    setNewComment("");
    openComments(sessionId);
  };

  const renderAuthor = (profile: PublicProfile | null, createdAt: string, badge?: string) => {
    if (!profile) return null;
    return (
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
          <span className="text-xs font-bold text-[var(--primary)]">{profile.firstName?.[0]?.toUpperCase() || "?"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--on-surface)]">{profile.firstName || profile.username}</p>
          <p className="text-[10px] text-[var(--outline)]">@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>
        </div>
        {badge && <Badge className="bg-[var(--tertiary)]/15 text-[var(--tertiary)]">{badge}</Badge>}
        <span className="text-[10px] text-[var(--outline)] shrink-0">{formatRelative(createdAt)}</span>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#f472b6] to-[#818cf8] bg-clip-text text-transparent">Feed</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Partage et decouvre l'activite de tes wings et de la communaute</p>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <Input placeholder="Filtrer par ville..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFeed(cityFilter || undefined)} />
        </div>
        <Button size="sm" onClick={() => loadFeed(cityFilter || undefined)}>Filtrer</Button>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>}
          title="Aucune activite"
          description="Personne n'a encore partage de contenu."
        />
      ) : (
        <div className="space-y-4">
          {feed.map((item, idx) => (
            <div key={`${item.type}-${item.data.id}`} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              {/* SESSION */}
              {item.type === "session" && (
                <Card className="!p-4">
                  {renderAuthor(item.profile, item.createdAt)}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-[var(--on-surface)]">{item.data.title || "Session"}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--on-surface-variant)]">
                      {item.data.location && (
                        <span className="flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          {item.data.location}
                        </span>
                      )}
                      <span>{item.data.interactionIds?.length || 0} approche{(item.data.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                    </div>
                    {item.data.notes && <p className="text-xs text-[var(--on-surface-variant)] mt-2 line-clamp-3">{item.data.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t border-[var(--border)]">
                    <button onClick={() => handleLike(item.data.id)} className="flex items-center gap-1.5 text-[var(--outline)] hover:text-[var(--secondary)] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      <span className="text-xs">{item.likeCount || 0}</span>
                    </button>
                    <button onClick={() => openComments(item.data.id)} className="flex items-center gap-1.5 text-[var(--outline)] hover:text-[var(--primary)] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                      <span className="text-xs">{item.commentCount || 0}</span>
                    </button>
                  </div>
                  {expandedComments === item.data.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-[var(--primary)]">{c.profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--outline)]">{c.profile?.firstName || "Anonyme"} · {formatRelative(c.createdAt)}</p>
                            <p className="text-xs text-[var(--on-surface-variant)]">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Commenter..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment(item.data.id)} className="flex-1" />
                        <Button size="sm" onClick={() => handleComment(item.data.id)} disabled={!newComment.trim()}>Envoyer</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* JOURNAL ENTRY */}
              {item.type === "journal" && (
                <Card className="!p-4">
                  {renderAuthor(item.profile, item.createdAt, item.data.visibility === "wings" ? "Wings" : undefined)}
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="text-xs text-[var(--secondary)] font-medium">Journal</span>
                    {item.data.tag && <Badge className={JOURNAL_TAG_COLORS[item.data.tag as keyof typeof JOURNAL_TAG_COLORS]}>{JOURNAL_TAG_LABELS[item.data.tag as keyof typeof JOURNAL_TAG_LABELS]}</Badge>}
                  </div>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed line-clamp-5">{item.data.content}</p>
                </Card>
              )}

              {/* POST */}
              {item.type === "post" && (
                <Card className="!p-4">
                  {renderAuthor(item.profile, item.createdAt, item.data.visibility === "wings" ? "Wings" : undefined)}
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.data.content}</p>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
