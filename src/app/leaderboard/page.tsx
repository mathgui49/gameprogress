"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchLeaderboard } from "@/lib/db";

interface LeaderboardEntry {
  userId: string;
  username: string;
  firstName: string;
  location: string;
  xp: number;
  level: number;
  streak: number;
}

export default function LeaderboardPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cityFilter, setCityFilter] = useState("");

  const load = async (city?: string) => {
    const data = await fetchLeaderboard(city);
    setEntries(data);
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 0) return "from-amber-400/30 to-amber-500/10 border-amber-400/30 text-amber-400";
    if (rank === 1) return "from-[#a09bb2]/20 to-[#a09bb2]/5 border-[#a09bb2]/20 text-[#a09bb2]";
    if (rank === 2) return "from-orange-400/20 to-orange-400/5 border-orange-400/20 text-orange-400";
    return "from-transparent to-transparent border-[rgba(192,132,252,0.08)] text-[#6b6580]";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return `#${rank + 1}`;
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Leaderboard</h1>
        <p className="text-sm text-[#a09bb2]">Classement par niveau et XP</p>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <Input placeholder="Filtrer par ville..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(cityFilter || undefined)} />
        </div>
        <Button size="sm" onClick={() => load(cityFilter || undefined)}>Filtrer</Button>
        {cityFilter && <Button size="sm" variant="ghost" onClick={() => { setCityFilter(""); load(); }}>Tout</Button>}
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.52.587 6.023 6.023 0 01-2.52-.587" /></svg>}
          title="Aucun joueur"
          description="Aucun profil public avec des stats de gamification."
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const isMe = entry.userId === userId;
            return (
              <div key={entry.userId} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                <div className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${getRankStyle(idx)} ${isMe ? "ring-1 ring-[#c084fc]/30" : ""}`}>
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span className={`text-sm font-bold ${idx < 3 ? "" : "text-[#6b6580]"}`}>{getRankIcon(idx)}</span>
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg bg-[#0d0a12] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#c084fc]">{entry.firstName?.[0]?.toUpperCase() || entry.username?.[0]?.toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? "text-[#c084fc]" : "text-white"}`}>
                      {entry.firstName || entry.username}
                      {isMe && <span className="text-[10px] ml-1.5 text-[#c084fc]/60">(toi)</span>}
                    </p>
                    <p className="text-[10px] text-[#6b6580]">@{entry.username}{entry.location ? ` · ${entry.location}` : ""}</p>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#c084fc]">Niv. {entry.level}</p>
                    <p className="text-[10px] text-[#6b6580]">{entry.xp} XP{entry.streak > 0 ? ` · ${entry.streak}j streak` : ""}</p>
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
