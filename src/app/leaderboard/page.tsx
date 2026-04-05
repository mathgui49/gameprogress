"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { useWingRequests } from "@/hooks/useWingRequests";
import { fetchLeaderboardAction } from "@/actions/db";

interface LeaderboardEntry {
  userId: string;
  username: string;
  firstName: string;
  location: string;
  profilePhoto: string | null;
  xp: number;
  level: number;
  streak: number;
  lastWeekXp?: number;
}

type LeaderboardScope = "global" | "wings";

export default function LeaderboardPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { wingProfiles } = useWingRequests();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [scope, setScope] = useState<LeaderboardScope>("global");

  const load = async (city?: string) => {
    const data = await fetchLeaderboardAction(city);
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

  const myGlobalRank = useMemo(() => entries.findIndex((e) => e.userId === userId), [entries, userId]);
  const myFilteredRank = useMemo(() => filteredEntries.findIndex((e) => e.userId === userId), [filteredEntries, userId]);

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
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1"><span className="bg-gradient-to-r from-[#f59e0b] via-[#f472b6] to-[#c084fc] bg-clip-text text-transparent">Classement</span></h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Compare ta progression avec tes wings et la communaute</p>
      </div>

      {/* Scope toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-low)] rounded-xl">
          <button onClick={() => setScope("global")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scope === "global" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
            Global
          </button>
          <button onClick={() => setScope("wings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scope === "wings" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
            Mes Wings
          </button>
        </div>
      </div>

      {/* City filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input placeholder="Filtrer par ville..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(cityFilter || undefined)} />
        </div>
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
            {entries[myGlobalRank]?.lastWeekXp !== undefined && (
              <div className="text-right">
                <p className="text-xs text-[var(--on-surface-variant)]">XP cette semaine</p>
                <p className={`text-sm font-semibold ${(entries[myGlobalRank]?.xp ?? 0) - (entries[myGlobalRank]?.lastWeekXp ?? 0) > 0 ? "text-emerald-400" : "text-[var(--outline)]"}`}>
                  +{(entries[myGlobalRank]?.xp ?? 0) - (entries[myGlobalRank]?.lastWeekXp ?? 0)} XP
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {!loaded ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.52.587 6.023 6.023 0 01-2.52-.587" /></svg>}
          title={scope === "wings" ? "Aucun wing classé" : "Aucun joueur"}
          description={scope === "wings" ? "Invite des wings pour voir le classement entre amis." : "Aucun profil public avec des stats de gamification."}
        />
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry, idx) => {
            const isMe = entry.userId === userId;
            const rank = getRankLabel(idx);
            return (
              <div key={entry.userId} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                <div className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${getRankStyle(idx)} ${isMe ? "ring-1 ring-[var(--primary)]/30" : ""}`}>
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span className={`text-sm font-bold ${rank.color}`}>{rank.text}</span>
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
                    <p className="text-[10px] text-[var(--outline)]">{entry.xp} XP{entry.streak > 0 ? ` · ${entry.streak}j streak` : ""}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
