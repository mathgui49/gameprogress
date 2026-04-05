"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useWingRequests } from "@/hooks/useWingRequests";
import { fetchProfilesByIds } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconUsers } from "@/components/ui/Icons";
import { MapView } from "@/components/ui/MapView";
import type { MapMarker } from "@/components/ui/MapView";
import type { PublicProfile } from "@/types";
import { formatDate, computeAge } from "@/lib/utils";

type Tab = "wings" | "discover" | "map" | "invitations";

export default function WingsPage() {
  const { profile: myProfile, discoverProfiles, findByUsername } = usePublicProfile();
  const {
    wingProfiles, loaded, pendingReceived, pendingSent,
    sendRequest, acceptRequest, declineRequest, isWing, hasPendingTo,
  } = useWingRequests();

  const [tab, setTab] = useState<Tab>("wings");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<PublicProfile | null>(null);
  const [searchError, setSearchError] = useState("");
  const [discoverResults, setDiscoverResults] = useState<PublicProfile[]>([]);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [pendingProfiles, setPendingProfiles] = useState<Record<string, PublicProfile>>({});

  // Resolve profiles for pending requests
  useEffect(() => {
    const allIds = [
      ...pendingReceived.map((r) => r.fromUserId),
      ...pendingSent.map((r) => r.toUserId),
    ];
    const uniqueIds = [...new Set(allIds)].filter((id) => !pendingProfiles[id]);
    if (uniqueIds.length === 0) return;
    fetchProfilesByIds(uniqueIds).then((profiles) => {
      const map: Record<string, PublicProfile> = { ...pendingProfiles };
      profiles.forEach((p: PublicProfile) => { map[p.userId] = p; });
      setPendingProfiles(map);
    });
  }, [pendingReceived, pendingSent]);

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  const handleSearchUsername = async () => {
    if (!searchUsername.trim()) return;
    setSearchError("");
    setSearchResult(null);
    const profile = await findByUsername(searchUsername.trim().toLowerCase());
    if (!profile) {
      setSearchError("Aucun utilisateur trouve avec ce nom.");
    } else {
      setSearchResult(profile);
    }
  };

  const handleDiscover = async () => {
    const results = await discoverProfiles(discoverSearch || undefined);
    setDiscoverResults(results);
    setDiscoverLoaded(true);
  };

  // Build map markers from wings + discover results
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
    { key: "discover", label: "Decouvrir" },
    { key: "map", label: "Carte" },
    { key: "invitations", label: "Invitations", count: pendingReceived.length },
  ];

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight mb-1">Wings</h1>
        <p className="text-sm text-[#a09bb2]">Tes partenaires de session et la communaute</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#14111c] rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs font-medium py-2.5 rounded-lg transition-all ${
              tab === t.key
                ? "bg-[#c084fc]/15 text-[#c084fc]"
                : "text-[#6b6580] hover:text-[#a09bb2]"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-[#c084fc]/20" : "bg-[#3d3650]"
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
              <p className="text-xs text-[#a09bb2] mb-3">Va dans Parametres pour creer ton nom d&apos;utilisateur et rendre ton profil visible.</p>
              <Link href="/settings"><Button size="sm">Aller aux parametres</Button></Link>
            </Card>
          )}

          {wingProfiles.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={28} />}
              title="Aucun wing"
              description="Cherche des partenaires dans l'onglet Decouvrir ou invite quelqu'un avec son nom d'utilisateur."
              action={<Button onClick={() => setTab("discover")}>Decouvrir</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wingProfiles.map((wing, idx) => (
                <div key={wing.userId} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <Link href={`/wings/${encodeURIComponent(wing.username)}`}>
                    <Card hover className="!p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-[#c084fc]">{wing.firstName?.[0]?.toUpperCase() || wing.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{wing.firstName || wing.username}</p>
                          <p className="text-[10px] text-[#6b6580]">@{wing.username}</p>
                          {wing.location && <p className="text-[10px] text-[#a09bb2] mt-0.5">{wing.location}</p>}
                        </div>
                        <svg className="w-4 h-4 text-[#6b6580]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </div>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Decouvrir */}
      {tab === "discover" && (
        <>
          {/* Search by username */}
          <Card className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">Chercher par nom d&apos;utilisateur</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="@nom_utilisateur"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUsername()}
                />
              </div>
              <Button size="sm" onClick={handleSearchUsername}>Chercher</Button>
            </div>
            {searchError && <p className="text-xs text-[#fb7185] mt-2">{searchError}</p>}
            {searchResult && (
              <div className="mt-3 p-3 rounded-xl bg-[#0d0a12] border border-[rgba(192,132,252,0.08)]">
                <ProfileCard
                  profile={searchResult}
                  isWing={isWing(searchResult.userId)}
                  hasPending={hasPendingTo(searchResult.userId)}
                  onInvite={() => sendRequest(searchResult.userId)}
                />
              </div>
            )}
          </Card>

          {/* Browse nearby */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Profils a proximite</h3>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Filtrer par ville..."
                  value={discoverSearch}
                  onChange={(e) => setDiscoverSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                />
              </div>
              <Button size="sm" onClick={handleDiscover}>Explorer</Button>
            </div>

            {discoverLoaded && discoverResults.length === 0 && (
              <p className="text-xs text-[#6b6580] text-center py-4">Aucun profil public trouve{discoverSearch ? ` pour "${discoverSearch}"` : ""}.</p>
            )}

            <div className="space-y-2">
              {discoverResults.map((p) => (
                <div key={p.userId} className="p-3 rounded-xl bg-[#0d0a12] border border-[rgba(192,132,252,0.08)]">
                  <ProfileCard
                    profile={p}
                    isWing={isWing(p.userId)}
                    hasPending={hasPendingTo(p.userId)}
                    onInvite={() => sendRequest(p.userId)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* TAB: Carte */}
      {tab === "map" && (
        <>
          <Card className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">Communaute sur la carte</h3>
            <p className="text-xs text-[#a09bb2] mb-4">Tes wings et les membres publics de la communaute.</p>
            {!discoverLoaded && (
              <div className="mb-3">
                <Button size="sm" onClick={async () => { const results = await discoverProfiles(); setDiscoverResults(results); setDiscoverLoaded(true); }}>
                  Charger les profils publics
                </Button>
              </div>
            )}
            <div className="h-[400px] rounded-xl overflow-hidden border border-[rgba(192,132,252,0.08)]">
              <MapView
                markers={mapMarkers}
                center={myProfile?.lat && myProfile?.lng ? [myProfile.lat, myProfile.lng] : undefined}
              />
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
                <span className="text-[10px] text-[#a09bb2]">Wings ({wingProfiles.filter((p) => p.lat && p.lng).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" />
                <span className="text-[10px] text-[#a09bb2]">Communaute ({discoverResults.filter((p) => p.lat && p.lng && !isWing(p.userId)).length})</span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* TAB: Invitations */}
      {tab === "invitations" && (
        <>
          {/* Received */}
          <Card className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Recues
              {pendingReceived.length > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[#c084fc]/15 text-[#c084fc]">{pendingReceived.length}</span>}
            </h3>
            {pendingReceived.length === 0 ? (
              <p className="text-xs text-[#6b6580]">Aucune invitation en attente.</p>
            ) : (
              <div className="space-y-2">
                {pendingReceived.map((req) => {
                  const p = pendingProfiles[req.fromUserId];
                  const age = computeAge(p?.birthDate);
                  const showAge = p?.privacy?.shareAgePublic || p?.privacy?.shareAgeWings;
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0d0a12] border border-[rgba(192,132,252,0.08)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#c084fc]">{p?.firstName?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white">{p?.firstName || "—"}{age && showAge ? <span className="text-[#6b6580] ml-1">{age} ans</span> : ""}</p>
                          <p className="text-[10px] text-[#6b6580]">@{p?.username || "—"} · {formatDate(req.createdAt)}</p>
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

          {/* Sent */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Envoyees</h3>
            {pendingSent.length === 0 ? (
              <p className="text-xs text-[#6b6580]">Aucune invitation envoyee en attente.</p>
            ) : (
              <div className="space-y-2">
                {pendingSent.map((req) => {
                  const p = pendingProfiles[req.toUserId];
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0d0a12] border border-[rgba(192,132,252,0.08)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1a1626] flex items-center justify-center">
                          <span className="text-xs font-bold text-[#6b6580]">{p?.firstName?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white">{p?.firstName || "—"}</p>
                          <p className="text-[10px] text-[#6b6580]">@{p?.username || "—"} · {formatDate(req.createdAt)}</p>
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
            <span className="text-xs font-bold text-[#c084fc]">{profile.firstName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{profile.firstName || profile.username}</p>
            <p className="text-[10px] text-[#6b6580]">@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>
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
      {profile.bio && <p className="text-xs text-[#a09bb2] mt-2 ml-12">{profile.bio}</p>}
    </div>
  );
}
