"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchActivityFeed, toggleSessionLike, fetchSessionComments, addSessionComment, fetchProfilesByIds } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import type { Session, PublicProfile, SessionComment } from "@/types";

interface FeedItem {
  session: Session & { userId?: string };
  profile: PublicProfile | null;
  likeCount: number;
  commentCount: number;
}

export default function FeedPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<(SessionComment & { profile?: PublicProfile })[]>([]);
  const [newComment, setNewComment] = useState("");

  const loadFeed = async (city?: string) => {
    const data = await fetchActivityFeed(city) as FeedItem[];
    setFeed(data);
    setLoaded(true);
  };

  useEffect(() => { loadFeed(); }, []);

  const handleLike = async (sessionId: string) => {
    await toggleSessionLike(sessionId, userId);
    loadFeed(cityFilter || undefined);
  };

  const openComments = async (sessionId: string) => {
    if (expandedComments === sessionId) { setExpandedComments(null); return; }
    setExpandedComments(sessionId);
    const data = await fetchSessionComments(sessionId);
    // Load profiles for commenters
    const commenterIds = [...new Set(data.map((c: any) => c.userId))];
    const profiles = await fetchProfilesByIds(commenterIds);
    const profileMap: Record<string, PublicProfile> = {};
    profiles.forEach((p: PublicProfile) => { profileMap[p.userId] = p; });
    setComments(data.map((c: any) => ({ ...c, profile: profileMap[c.userId] })));
  };

  const handleComment = async (sessionId: string) => {
    if (!newComment.trim()) return;
    await addSessionComment(sessionId, userId, newComment.trim());
    setNewComment("");
    openComments(sessionId);
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Feed</h1>
        <p className="text-sm text-[#a09bb2]">Sessions publiques de la communaute</p>
      </div>

      {/* City filter */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <Input placeholder="Filtrer par ville..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFeed(cityFilter || undefined)} />
        </div>
        <Button size="sm" onClick={() => loadFeed(cityFilter || undefined)}>Filtrer</Button>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>}
          title="Aucune activite"
          description="Personne n'a encore partage de session publique."
        />
      ) : (
        <div className="space-y-4">
          {feed.map((item, idx) => (
            <div key={item.session.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <Card className="!p-4">
                {/* Author */}
                {item.profile && (
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#c084fc]">{item.profile.firstName?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.profile.firstName || item.profile.username}</p>
                      <p className="text-[10px] text-[#6b6580]">@{item.profile.username}{item.profile.location ? ` · ${item.profile.location}` : ""}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-[#6b6580]">{formatRelative(item.session.createdAt)}</span>
                  </div>
                )}

                {/* Session content */}
                <div className="mb-3">
                  <p className="text-sm font-semibold text-white">{item.session.title || "Session"}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#a09bb2]">
                    {item.session.location && (
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {item.session.location}
                      </span>
                    )}
                    <span>{formatDate(item.session.date)}</span>
                    <span>{item.session.interactionIds?.length || 0} approche{(item.session.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                  </div>
                  {item.session.notes && <p className="text-xs text-[#a09bb2] mt-2 line-clamp-3">{item.session.notes}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-[rgba(192,132,252,0.06)]">
                  <button onClick={() => handleLike(item.session.id)} className="flex items-center gap-1.5 text-[#6b6580] hover:text-[#f472b6] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                    <span className="text-xs">{item.likeCount}</span>
                  </button>
                  <button onClick={() => openComments(item.session.id)} className="flex items-center gap-1.5 text-[#6b6580] hover:text-[#c084fc] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                    <span className="text-xs">{item.commentCount}</span>
                  </button>
                </div>

                {/* Comments expanded */}
                {expandedComments === item.session.id && (
                  <div className="mt-3 pt-3 border-t border-[rgba(192,132,252,0.06)] space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#c084fc]/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-[#c084fc]">{c.profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#6b6580]">{c.profile?.firstName || c.profile?.username || "Anonyme"} · {formatRelative(c.createdAt)}</p>
                          <p className="text-xs text-[#a09bb2]">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input placeholder="Commenter..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment(item.session.id)} className="flex-1" />
                      <Button size="sm" onClick={() => handleComment(item.session.id)} disabled={!newComment.trim()}>Envoyer</Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
