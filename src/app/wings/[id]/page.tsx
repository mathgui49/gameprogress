"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWingRequests } from "@/hooks/useWingRequests";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PublicProfile, Session } from "@/types";
import { formatDate, computeAge } from "@/lib/utils";
import { findProfileByUsername, fetchOne, fromRow } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function WingProfilePage() {
  const params = useParams();
  const wingUserId = decodeURIComponent(params.id as string);
  const { isWing, getWingSessions, sendRequest, hasPendingTo } = useWingRequests();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch the wing's public profile
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("user_id", wingUserId)
        .single();
      if (data && !error) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          obj[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
        }
        setProfile(obj as unknown as PublicProfile);
      }

      // If they're a wing, load their sessions
      if (isWing(wingUserId)) {
        const s = await getWingSessions(wingUserId);
        setSessions(s);
      }
      setLoaded(true);
    }
    load();
  }, [wingUserId, isWing, getWingSessions]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  if (!profile) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto">
        <p className="text-sm text-[#a09bb2]">Profil introuvable.</p>
        <Link href="/wings" className="text-sm text-[#c084fc] mt-2 inline-block">← Retour</Link>
      </div>
    );
  }

  const wingConnected = isWing(wingUserId);
  const pending = hasPendingTo(wingUserId);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in">
      <Link href="/wings" className="text-sm text-[#6b6580] hover:text-[#c084fc] transition-colors mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Wings
      </Link>

      {/* Profile header */}
      <Card className="mb-4 mt-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
            <span className="text-xl font-bold text-[#c084fc]">{profile.firstName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-[family-name:var(--font-grotesk)] font-bold text-white">
              {profile.firstName || profile.username}
              {(() => {
                const age = computeAge(profile.birthDate);
                const canSee = wingConnected ? profile.privacy?.shareAgeWings : profile.privacy?.shareAgePublic;
                return age && canSee ? <span className="text-sm font-normal text-[#a09bb2] ml-2">{age} ans</span> : null;
              })()}
            </h1>
            <p className="text-sm text-[#6b6580]">@{profile.username}</p>
            {profile.location && (
              <p className="text-xs text-[#a09bb2] mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {profile.location}
              </p>
            )}
          </div>
          {wingConnected ? (
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-400 font-medium">Wing</span>
          ) : pending ? (
            <span className="text-xs px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-400 font-medium">En attente</span>
          ) : (
            <Button size="sm" onClick={() => sendRequest(wingUserId)}>Inviter</Button>
          )}
        </div>
        {profile.bio && <p className="text-sm text-[#a09bb2] mt-3">{profile.bio}</p>}
      </Card>

      {/* Wing's sessions (only visible if connected) */}
      {wingConnected ? (
        <div>
          <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-white mb-3">
            Sessions de {profile.firstName || profile.username}
          </h2>
          {sessions.length === 0 ? (
            <Card>
              <p className="text-sm text-[#6b6580] text-center py-4">Aucune session pour le moment.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, idx) => (
                <div key={s.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <Card className="!p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{s.title || "Session sans titre"}</p>
                      <p className="text-[10px] text-[#6b6580]">{formatDate(s.date)}</p>
                    </div>
                    {s.location && <p className="text-xs text-[#a09bb2] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {s.location}
                    </p>}
                    {s.notes && <p className="text-xs text-[#a09bb2] mt-2 line-clamp-2">{s.notes}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6b6580]">
                      <span>{s.interactionIds?.length || 0} interaction{(s.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                      <span>{s.goals?.filter((g: { done: boolean }) => g.done).length || 0}/{s.goals?.length || 0} objectifs</span>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <div className="text-center py-6">
            <svg className="w-8 h-8 mx-auto text-[#3d3650] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            <p className="text-sm text-[#a09bb2]">Deviens wing avec {profile.firstName || profile.username} pour voir ses sessions.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
