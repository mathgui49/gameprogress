"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { useWingRequests } from "@/hooks/useWingRequests";
import { fetchLeaderboardWithXpDetailsAction } from "@/actions/db";
import { useSubscription } from "@/hooks/useSubscription";
import { BlurredPremium, UpgradeCard } from "@/components/ui/PremiumGate";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";

interface LeaderboardEntry {
  userId: string;
  username: string;
  firstName: string;
  location: string;
  profilePhoto: string | null;
  xp: number;
  level: number;
  streak: number;
  weeklyXp?: number;
  xpBreakdown?: Record<string, number>;
}

type LeaderboardScope = "global" | "wings";
type LeaderboardView = "ranking" | "progression";

const XP_CATEGORY_LABELS: Record<string, string> = {
  "Interaction": "Approches",
  "Close": "Closes",
  "Post journal": "Journal",
  "Mission complétée": "Missions",
  "Contact ajouté": "Contacts",
  "Streak bonus": "Streak",
  "Pipeline": "Pipeline",
};

export default function LeaderboardPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const toast = useToast();
  const { wingProfiles, sendRequest, isWing, hasPendingTo } = useWingRequests();
  const { isPremium } = useSubscription();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [view, setView] = useState<LeaderboardView>("ranking");

  // Compare modal
  const [compareWith, setCompareWith] = useState<string | null>(null);

  // XP detail modal
  const [detailUser, setDetailUser] = useState<LeaderboardEntry | null>(null);

  const load = async (city?: string) => {
    const data = await fetchLeaderboardWithXpDetailsAction(city);
    setEntries(data);
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const wingUserIds = useMemo(() => new Set(wingProfiles.map((wp: any) => wp.userId)), [wingProfiles]);

  const filteredEntries = useMemo(() => {
    if (scope === "wings") {
      return entries.filter((e) => wingUserIds.has(e.userId) || e.userId === userId);
    }
    return entries;
  }, [entries, scope, wingUserIds, userId]);

  // For progression view: sort by weekly XP delta
  const progressionEntries = useMemo(() => {
    return [...filteredEntries]
      .filter((e) => (e.weeklyXp ?? 0) > 0)
      .sort((a, b) => (b.weeklyXp ?? 0) - (a.weeklyXp ?? 0));
  }, [filteredEntries]);

  const displayEntries = view === "progression" ? progressionEntries : filteredEntries;

  const myGlobalRank = useMemo(() => entries.findIndex((e) => e.userId === userId), [entries, userId]);
  const myFilteredRank = useMemo(() => filteredEntries.findIndex((e) => e.userId === userId), [filteredEntries, userId]);
  const myEntry = entries.find((e) => e.userId === userId);
  const compareEntry = compareWith ? entries.find((e) => e.userId === compareWith) : null;

  const getRankStyle = (rank: number) => {
    if (rank === 0) return "from-amber-400/30 to-amber-500/10 border-amber-400/30";
    if (rank === 1) return "from-[#a09bb2]/20 to-[#a09bb2]/5 border-[var(--outline-variant)]/20";
    if (rank === 2) return "from-orange-400/20 to-orange-400/5 border-orange-400/20";
    return "from-transparent to-transparent border-[var(--border)]";
  };

  const getRankLabel = (rank: number) => {
    if (rank === 0) return { text: "1er", color: "text-amber-400" };
    if (rank === 1) return { text: "2e", color: "text-[var(--on-surface-variant)]" };
    if (rank === 2) return { text: "3e", color: "text-orange-400" };
    return { text: `${rank + 1}e`, color: "text-[var(--outline)]" };
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#f59e0b] via-[#f472b6] to-[#c084fc] bg-clip-text text-transparent animate-gradient-text">Classement</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Compare ta progression avec tes wings et la communauté</p>
      </div>

      {/* Scope + View toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-xl">
          <button onClick={() => setScope("global")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scope === "global" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>Global</button>
          <button onClick={() => setScope("wings")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scope === "wings" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>Mes Wings</button>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-xl">
          <button onClick={() => setView("ranking")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "ranking" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>Classement</button>
          <button onClick={() => setView("progression")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "progression" ? "bg-emerald-400/15 text-emerald-400" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>Évolution</button>
        </div>
      </div>

      {/* City filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1"><Input placeholder="Filtrer par ville..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(cityFilter || undefined)} /></div>
        <Button size="sm" onClick={() => load(cityFilter || undefined)}>Filtrer</Button>
        {cityFilter && <Button size="sm" variant="ghost" onClick={() => { setCityFilter(""); load(); }}>Tout</Button>}
      </div>

      {/* My rank summary */}
      {loaded && myGlobalRank >= 0 && (
        <Card className="mb-4 !p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--on-surface-variant)]">Ta position</p>
              <p className="text-lg font-bold text-[var(--primary)]">
                {scope === "global" ? myGlobalRank + 1 : myFilteredRank + 1}
                <span className="text-xs text-[var(--outline)] font-normal ml-1">/ {filteredEntries.length}</span>
              </p>
            </div>
            {myEntry?.weeklyXp !== undefined && (
              <div className="text-right">
                <p className="text-xs text-[var(--on-surface-variant)]">XP cette semaine</p>
                <p className={`text-sm font-semibold ${(myEntry?.weeklyXp ?? 0) > 0 ? "text-emerald-400" : "text-[var(--outline)]"}`}>
                  +{Math.round(myEntry?.weeklyXp ?? 0)} XP
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Animated Podium (top 3) — only in ranking view */}
      {loaded && view === "ranking" && displayEntries.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-6 h-[200px]">
          {/* 2nd place */}
          <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#a09bb2]/20 to-[#a09bb2]/10 flex items-center justify-center mb-2 overflow-hidden">
              {displayEntries[1].profilePhoto ? (
                <img src={displayEntries[1].profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-[var(--on-surface-variant)]">{displayEntries[1].firstName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--on-surface)] truncate max-w-[80px]">{displayEntries[1].firstName}</p>
            <p className="text-[10px] text-[var(--outline)]">Niv. {displayEntries[1].level}</p>
            <div className="w-20 h-24 mt-2 rounded-t-xl bg-gradient-to-t from-[#a09bb2]/20 to-[#a09bb2]/5 flex items-center justify-center border border-[var(--outline-variant)]/20 border-b-0">
              <span className="text-2xl font-bold text-[var(--on-surface-variant)]">2</span>
            </div>
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-500/10 flex items-center justify-center mb-2 overflow-hidden ring-2 ring-amber-400/30">
                {displayEntries[0].profilePhoto ? (
                  <img src={displayEntries[0].profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-amber-400">{displayEntries[0].firstName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</div>
            </div>
            <p className="text-sm font-bold text-[var(--on-surface)] truncate max-w-[90px]">{displayEntries[0].firstName}</p>
            <p className="text-[10px] text-amber-400 font-medium">Niv. {displayEntries[0].level} · {Math.round(displayEntries[0].xp)} XP</p>
            <div className="w-24 h-32 mt-2 rounded-t-xl bg-gradient-to-t from-amber-400/20 to-amber-500/5 flex items-center justify-center border border-amber-400/20 border-b-0">
              <span className="text-3xl font-bold text-amber-400">1</span>
            </div>
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400/20 to-orange-400/5 flex items-center justify-center mb-2 overflow-hidden">
              {displayEntries[2].profilePhoto ? (
                <img src={displayEntries[2].profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-orange-400">{displayEntries[2].firstName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--on-surface)] truncate max-w-[80px]">{displayEntries[2].firstName}</p>
            <p className="text-[10px] text-[var(--outline)]">Niv. {displayEntries[2].level}</p>
            <div className="w-20 h-16 mt-2 rounded-t-xl bg-gradient-to-t from-orange-400/20 to-orange-400/5 flex items-center justify-center border border-orange-400/20 border-b-0">
              <span className="text-2xl font-bold text-orange-400">3</span>
            </div>
          </div>
        </div>
      )}

      {!loaded ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>
      ) : displayEntries.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.52.587 6.023 6.023 0 01-2.52-.587" /></svg>}
          title={view === "progression" ? "Aucune évolution cette semaine" : scope === "wings" ? "Aucun wing classé" : "Aucun gamer"}
          description={view === "progression" ? "Personne n'a gagné d'XP cette semaine." : scope === "wings" ? "Invite des wings pour voir le classement entre amis." : "Aucun profil public avec des stats de gamification."}
        />
      ) : (
        <div className="space-y-2">
          {/* Progression view header */}
          {view === "progression" && (
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-400/15 text-emerald-400">Top évolutions cette semaine</Badge>
            </div>
          )}

          {displayEntries.slice(0, isPremium ? undefined : 3).map((entry, idx) => {
            const isMe = entry.userId === userId;
            const rank = view === "progression"
              ? { text: `+${entry.weeklyXp ?? 0}`, color: "text-emerald-400" }
              : getRankLabel(idx);
            return (
              <div key={entry.userId} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${view === "ranking" ? getRankStyle(idx) : "from-transparent to-transparent border-[var(--border)]"} ${isMe ? "ring-1 ring-[var(--primary)]/30" : ""} cursor-pointer hover:border-[var(--primary)]/30 transition-all`}
                  onClick={() => setDetailUser(entry)}
                >
                  {/* Rank or delta */}
                  <div className="w-10 text-center shrink-0">
                    {view === "progression" ? (
                      <span className="text-xs font-bold text-emerald-400">+{Math.round(entry.weeklyXp ?? 0)}</span>
                    ) : (
                      <span className={`text-sm font-bold ${rank.color}`}>{rank.text}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.profilePhoto ? (
                    <img src={entry.profilePhoto} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-low)] flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--primary)]">{entry.firstName?.[0]?.toUpperCase() || entry.username?.[0]?.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? "text-[var(--primary)]" : "text-[var(--on-surface)]"}`}>
                      {entry.firstName || entry.username}
                      {isMe && <span className="text-[10px] ml-1.5 text-[var(--primary)]/60">(toi)</span>}
                    </p>
                    <p className="text-[10px] text-[var(--outline)]">@{entry.username}{entry.location ? ` · ${entry.location}` : ""}</p>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <Tooltip text="Niveau basé sur l'XP total accumulé" position="left">
                      <p className="text-sm font-bold text-[var(--primary)]">Niv. {entry.level}</p>
                    </Tooltip>
                    <p className="text-[10px] text-[var(--outline)]">{Math.round(entry.xp)} XP{entry.streak > 0 ? ` · ${entry.streak}j` : ""}</p>
                  </div>

                  {/* Compare button */}
                  {!isMe && wingUserIds.has(entry.userId) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCompareWith(entry.userId); }}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] transition-colors text-[var(--outline)] shrink-0"
                      title="Comparer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!isPremium && displayEntries.length > 3 && (
            <div className="mt-4">
              <UpgradeCard feature="Classement complet" />
            </div>
          )}
        </div>
      )}

      {/* XP Detail Modal */}
      <Modal open={!!detailUser} onClose={() => setDetailUser(null)} title={detailUser ? `Détail XP — ${detailUser.firstName || detailUser.username}` : ""}>
        {detailUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center !p-3">
                <p className="text-xl font-bold text-[var(--primary)]">{detailUser.level}</p>
                <p className="text-[10px] text-[var(--outline)]">Niveau</p>
              </Card>
              <Card className="text-center !p-3">
                <p className="text-xl font-bold text-[var(--tertiary)]">{Math.round(detailUser.xp)}</p>
                <p className="text-[10px] text-[var(--outline)]">XP total</p>
              </Card>
              <Card className="text-center !p-3">
                <p className="text-xl font-bold text-emerald-400">+{Math.round(detailUser.weeklyXp ?? 0)}</p>
                <p className="text-[10px] text-[var(--outline)]">Cette semaine</p>
              </Card>
            </div>

            {detailUser.xpBreakdown && Object.keys(detailUser.xpBreakdown).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Répartition XP</h3>
                <div className="space-y-2">
                  {Object.entries(detailUser.xpBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([reason, amount]) => {
                      const total = Object.values(detailUser.xpBreakdown!).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                      const label = XP_CATEGORY_LABELS[reason] || reason;
                      return (
                        <div key={reason}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--on-surface-variant)]">{label}</span>
                            <span className="text-xs font-medium text-[var(--on-surface)]">{amount} XP ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--surface-low)] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {detailUser.streak > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/10">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-sm font-medium text-amber-400">{detailUser.streak} jours de streak</p>
                  <p className="text-[10px] text-[var(--outline)]">Jours consécutifs d&apos;activité</p>
                </div>
              </div>
            )}

            {/* Actions: profile + wing invite */}
            {detailUser.userId !== userId && (
              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                <Link href={`/wings/${detailUser.username || detailUser.userId}`} className="flex-1">
                  <Button variant="secondary" className="w-full">Voir le profil</Button>
                </Link>
                {isWing(detailUser.userId) ? (
                  <Button disabled className="flex-1">Déjà wing</Button>
                ) : hasPendingTo(detailUser.userId) ? (
                  <Button disabled className="flex-1">Invitation envoyée</Button>
                ) : (
                  <Button className="flex-1" onClick={() => { sendRequest(detailUser.userId); toast.show("Invitation wing envoyée !"); }}>
                    Inviter en wing
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Compare Modal */}
      <Modal open={!!compareWith} onClose={() => setCompareWith(null)} title="Comparaison">
        {myEntry && compareEntry && (
          <div className="space-y-4">
            {/* Headers */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--tertiary)]/20 flex items-center justify-center mx-auto mb-1 overflow-hidden">
                  {myEntry.profilePhoto ? <img src={myEntry.profilePhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-[var(--primary)]">{myEntry.firstName?.[0]?.toUpperCase()}</span>}
                </div>
                <p className="text-xs font-semibold text-[var(--primary)]">Toi</p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-lg font-bold text-[var(--outline)]">VS</span>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center mx-auto mb-1 overflow-hidden">
                  {compareEntry.profilePhoto ? <img src={compareEntry.profilePhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-[var(--tertiary)]">{compareEntry.firstName?.[0]?.toUpperCase()}</span>}
                </div>
                <p className="text-xs font-semibold text-[var(--tertiary)]">{compareEntry.firstName}</p>
              </div>
            </div>

            {/* Stats comparison */}
            {[
              { label: "Niveau", mine: myEntry.level, theirs: compareEntry.level },
              { label: "XP Total", mine: Math.round(myEntry.xp), theirs: Math.round(compareEntry.xp) },
              { label: "XP Semaine", mine: Math.round(myEntry.weeklyXp ?? 0), theirs: Math.round(compareEntry.weeklyXp ?? 0) },
              { label: "Streak", mine: myEntry.streak, theirs: compareEntry.streak },
            ].map((stat) => {
              const iWin = stat.mine > stat.theirs;
              const tie = stat.mine === stat.theirs;
              return (
                <div key={stat.label} className="grid grid-cols-3 gap-3 items-center">
                  <div className={`text-right text-sm font-bold ${iWin ? "text-emerald-400" : tie ? "text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>
                    {stat.mine}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--outline)]">{stat.label}</p>
                  </div>
                  <div className={`text-left text-sm font-bold ${!iWin && !tie ? "text-emerald-400" : tie ? "text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>
                    {stat.theirs}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
