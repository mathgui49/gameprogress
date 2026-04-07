"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useGamification } from "@/hooks/useGamification";
import { useInteractions } from "@/hooks/useInteractions";
import { useWings } from "@/hooks/useWings";
import type { PrivacySettings, PublicProfile } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { MapPicker } from "@/components/ui/MapPicker";
import { uploadImageAction } from "@/actions/db";

type PrivacyOption = "off" | "wings" | "public";

const PRIVACY_GROUPS: { label: string; hint: string; icon: string; publicKey: keyof PrivacySettings; wingsKey?: keyof PrivacySettings; noWings?: boolean }[] = [
  { label: "Classement", hint: "Apparaître dans le classement", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.52.587 6.023 6.023 0 01-2.52-.587", publicKey: "showInLeaderboardPublic", wingsKey: "showInLeaderboardWings" },
  { label: "Statistiques", hint: "Partager tes stats de progression", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", publicKey: "shareStatsPublic", wingsKey: "shareStatsWings" },
  { label: "Apparaître dans Découvrir", hint: "Les autres utilisateurs peuvent te trouver", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z", publicKey: "showInDiscover", noWings: true },
];

export default function ProfilPage() {
  const { data: session } = useSession();
  const { profile, loaded, saving, save } = usePublicProfile();
  const { level, xp, xpProgress, streak, bestStreak, badges, loaded: gamLoaded } = useGamification();
  const { interactions } = useInteractions();
  const { wings, loaded: wingsLoaded } = useWings();

  const [draft, setDraft] = useState<Partial<Omit<PublicProfile, "userId" | "createdAt">> | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "privacy">("profile");
  const [editMode, setEditMode] = useState(false);

  const d = draft ?? {
    username: profile?.username ?? "",
    firstName: profile?.firstName ?? "",
    birthDate: profile?.birthDate ?? null,
    location: profile?.location ?? "",
    lat: profile?.lat ?? null,
    lng: profile?.lng ?? null,
    bio: profile?.bio ?? "",
  };

  const updateDraft = (updates: Partial<typeof d>) => {
    setDraft({ ...d, ...updates });
    setSaved(false);
  };

  const handleSave = () => {
    save(d, true);
    setSaved(true);
    setEditMode(false);
    setDraft(null);
    setTimeout(() => setSaved(false), 2500);
  };

  const privacy = profile?.privacy ?? DEFAULT_PRIVACY;

  const getGroupValue = (g: typeof PRIVACY_GROUPS[number]): PrivacyOption => {
    if (privacy[g.publicKey]) return "public";
    if (g.wingsKey && privacy[g.wingsKey]) return "wings";
    return "off";
  };

  const setGroupValue = (g: typeof PRIVACY_GROUPS[number], v: PrivacyOption) => {
    const updates: Partial<PrivacySettings> = { [g.publicKey]: v === "public" };
    if (g.wingsKey) updates[g.wingsKey] = v === "wings" || v === "public";
    save({ privacy: { ...privacy, ...updates } }, true);
  };

  // Stats
  const totalInteractions = interactions?.length ?? 0;
  const totalWings = wings?.length ?? 0;
  const unlockedBadges = useMemo(() => badges?.filter((b) => b.unlockedAt) ?? [], [badges]);
  const memberSince = profile?.createdAt ? new Date(profile.createdAt) : null;

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const displayName = (d.firstName as string) || session?.user?.name?.split(" ")[0] || "Joueur";
  const displayUsername = (d.username as string) || null;
  const hasLocation = !!((d.location as string)?.trim());

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card shadow-lg border border-emerald-400/20">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs font-medium text-emerald-400">Profil sauvegardé</span>
          </div>
        </div>
      )}

      {/* ─── Hero Card ─── */}
      <div className="relative rounded-[22px] overflow-hidden glass-card border border-[var(--glass-border)] mb-6">
        {/* Gradient banner */}
        <div className="h-28 lg:h-36 bg-gradient-to-br from-[var(--primary)]/30 via-[var(--secondary)]/20 to-[var(--tertiary)]/25 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
          {/* Level badge top right */}
          {gamLoaded && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--neon-purple)]" />
              <span className="text-[11px] font-bold text-white/90">Niv. {level}</span>
            </div>
          )}
        </div>

        {/* Avatar & info */}
        <div className="px-5 lg:px-8 pb-6 -mt-12 lg:-mt-14 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Avatar with XP ring */}
            <div className="relative group">
              <div className="relative">
                <svg className="w-[88px] h-[88px] lg:w-[100px] lg:h-[100px] -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--glass-border)" strokeWidth="3" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="url(#xp-gradient)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(xpProgress / 100) * 276.46} 276.46`} className="transition-all duration-1000" />
                  <defs>
                    <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-[6px] lg:inset-[6px] rounded-full overflow-hidden bg-[var(--surface)] border-2 border-[var(--glass-border)]">
                  {profile?.profilePhoto ? (
                    <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20">
                      <span className="text-2xl lg:text-3xl font-bold text-[var(--primary)]">{displayName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Photo upload overlay */}
              <label className="absolute inset-0 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-[6px] rounded-full bg-black/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5_000_000) { alert("Photo trop lourde (max 5 Mo)"); return; }
                    const img = new window.Image();
                    img.onload = async () => {
                      const canvas = document.createElement("canvas");
                      const size = 256;
                      canvas.width = size;
                      canvas.height = size;
                      const ctx = canvas.getContext("2d")!;
                      const min = Math.min(img.width, img.height);
                      const sx = (img.width - min) / 2;
                      const sy = (img.height - min) / 2;
                      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                      const compressed = canvas.toDataURL("image/jpeg", 0.8);
                      const url = await uploadImageAction(compressed, "profiles");
                      if (url) save({ profilePhoto: url }, true);
                    };
                    img.src = URL.createObjectURL(file);
                  }}
                />
              </label>
            </div>

            {/* Name & details */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl lg:text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] tracking-tight leading-tight">
                {displayName}
              </h1>
              {displayUsername && (
                <p className="text-sm text-[var(--primary)] font-medium mt-0.5">@{displayUsername}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {hasLocation && (
                  <span className="flex items-center gap-1 text-xs text-[var(--on-surface-variant)]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {d.location as string}
                  </span>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1 text-xs text-[var(--on-surface-variant)]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Membre depuis {memberSince.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              {(d.bio as string)?.trim() && (
                <p className="text-sm text-[var(--on-surface-variant)] mt-3 leading-relaxed max-w-md">{d.bio as string}</p>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--on-surface-variant)] bg-[var(--surface-high)] border border-[var(--border)] hover:bg-[var(--surface-bright)] hover:text-[var(--on-surface)] transition-all self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {editMode ? "Annuler" : "Modifier"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 border-t border-[var(--glass-border)]">
          {[
            { label: "Interactions", value: totalInteractions, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
            { label: "Wings", value: totalWings, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
            { label: "Streak", value: `${streak}j`, icon: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.651 6.651 0 007.5 12a.75.75 0 001.06.025l.108-.104.172-.213A4.5 4.5 0 0112 7.5a4.497 4.497 0 013.362-2.286z" },
            { label: "Badges", value: unlockedBadges.length, icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-4 gap-1 hover:bg-[var(--glass-bg)] transition-colors">
              <svg className="w-4 h-4 text-[var(--outline)] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
              </svg>
              <span className="text-lg font-bold text-[var(--on-surface)] font-[family-name:var(--font-grotesk)]">{stat.value}</span>
              <span className="text-[10px] text-[var(--outline)] tracking-wide uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 mb-5 p-1 rounded-[14px] bg-[var(--surface-high)] border border-[var(--border)]">
        {(["profile", "privacy"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-xs font-medium transition-all ${
              activeTab === tab
                ? "bg-[var(--glass-bg)] backdrop-blur-sm text-[var(--on-surface)] shadow-sm border border-[var(--glass-border)]"
                : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab === "profile"
                ? "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                : "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              } />
            </svg>
            {tab === "profile" ? "Profil" : "Confidentialité"}
          </button>
        ))}
      </div>

      {/* ─── Profile Tab ─── */}
      {activeTab === "profile" && (
        <>
          {editMode ? (
            <Card className="animate-fade-in">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Modifier le profil</h2>
              </div>

              <div className="space-y-4">
                {/* Photo management */}
                <div>
                  <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Photo de profil</p>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[var(--surface-bright)] flex items-center justify-center overflow-hidden border-2 border-[var(--border)]">
                      {profile?.profilePhoto ? (
                        <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-[var(--primary)]">{displayName[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5_000_000) { alert("Photo trop lourde (max 5 Mo)"); return; }
                            const img = new window.Image();
                            img.onload = async () => {
                              const canvas = document.createElement("canvas");
                              const size = 256;
                              canvas.width = size;
                              canvas.height = size;
                              const ctx = canvas.getContext("2d")!;
                              const min = Math.min(img.width, img.height);
                              const sx = (img.width - min) / 2;
                              const sy = (img.height - min) / 2;
                              ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                              const compressed = canvas.toDataURL("image/jpeg", 0.8);
                              const url = await uploadImageAction(compressed, "profiles");
                              if (url) save({ profilePhoto: url }, true);
                            };
                            img.src = URL.createObjectURL(file);
                          }}
                        />
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer font-medium">
                          Changer
                        </span>
                      </label>
                      {profile?.profilePhoto && (
                        <button onClick={() => save({ profilePhoto: null }, true)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors font-medium">
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nom d'utilisateur" id="pu" placeholder="ex: mathieu_75" value={(d.username as string) ?? ""} onChange={(e) => updateDraft({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
                  <Input label="Prénom" id="pfn" placeholder="Ton prénom" value={(d.firstName as string) ?? ""} onChange={(e) => updateDraft({ firstName: e.target.value })} />
                </div>
                <Input label="Date de naissance" id="pbd" type="date" value={(d.birthDate as string) ?? ""} onChange={(e) => updateDraft({ birthDate: e.target.value || null })} />
                <MapPicker
                  label="Ville"
                  lat={(d.lat as number) ?? 48.8566}
                  lng={(d.lng as number) ?? 2.3522}
                  address={(d.location as string) ?? ""}
                  onAddressChange={(loc) => updateDraft({ location: loc })}
                  onCoordsChange={(newLat, newLng) => updateDraft({ lat: newLat, lng: newLng })}
                  hideMap={!hasLocation}
                />
                <TextArea label="Bio" id="pbio" placeholder="Quelques mots sur toi et ton game..." rows={3} value={(d.bio as string) ?? ""} onChange={(e) => updateDraft({ bio: e.target.value })} />

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? "Enregistrement..." : "Sauvegarder"}
                  </Button>
                  <Button variant="secondary" onClick={() => { setEditMode(false); setDraft(null); }}>
                    Annuler
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            /* View mode — show profile details as cards */
            <div className="space-y-4 animate-fade-in">
              {/* XP Progress card */}
              {gamLoaded && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--on-surface)]">Progression</h3>
                    </div>
                    <span className="text-xs font-medium text-[var(--on-surface-variant)]">{xp.toLocaleString()} XP total</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-[var(--outline)] mb-1">
                      <span>Niveau {level}</span>
                      <span>Niveau {level + 1}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[var(--surface-high)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-1000"
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--outline)] mt-1 text-right">{Math.round(xpProgress)}%</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-high)]">
                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.651 6.651 0 007.5 12a.75.75 0 001.06.025l.108-.104.172-.213A4.5 4.5 0 0112 7.5a4.497 4.497 0 013.362-2.286z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-[var(--on-surface)]">{streak} jours</p>
                        <p className="text-[10px] text-[var(--outline)]">Streak actuel</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-high)]">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-[var(--on-surface)]">{bestStreak} jours</p>
                        <p className="text-[10px] text-[var(--outline)]">Meilleur streak</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Badges showcase */}
              {unlockedBadges.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--on-surface)]">Badges ({unlockedBadges.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlockedBadges.slice(0, 8).map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400/10 to-orange-400/10 border border-amber-400/20"
                        title={badge.description}
                      >
                        <span className="text-sm">{badge.icon}</span>
                        <span className="text-[11px] font-medium text-[var(--on-surface)]">{badge.name}</span>
                      </div>
                    ))}
                    {unlockedBadges.length > 8 && (
                      <div className="flex items-center px-2.5 py-1.5 rounded-lg bg-[var(--surface-high)] text-[11px] text-[var(--outline)]">
                        +{unlockedBadges.length - 8}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Info details */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--tertiary)]/20 to-[var(--primary)]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--on-surface)]">Informations</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Nom d'utilisateur", value: displayUsername ? `@${displayUsername}` : "Non défini", empty: !displayUsername },
                    { label: "Prénom", value: displayName, empty: false },
                    { label: "Date de naissance", value: (d.birthDate as string) ? new Date(d.birthDate as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Non renseigné", empty: !(d.birthDate as string) },
                    { label: "Ville", value: (d.location as string) || "Non renseignée", empty: !hasLocation },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-xs text-[var(--outline)]">{item.label}</span>
                      <span className={`text-sm font-medium ${item.empty ? "text-[var(--outline-variant)] italic" : "text-[var(--on-surface)]"}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/8 border border-[var(--primary)]/15 hover:bg-[var(--primary)]/15 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Modifier mes informations
                </button>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ─── Privacy Tab ─── */}
      {activeTab === "privacy" && (
        <Card className="animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">Confidentialité</h2>
              <p className="text-[10px] text-[var(--outline)] mt-0.5">Tes stats entrent toujours dans le calcul anonyme de la moyenne communautaire</p>
            </div>
          </div>

          <div className="space-y-1">
            {PRIVACY_GROUPS.map((g) => {
              const current = getGroupValue(g);
              const options: { value: PrivacyOption; label: string; icon: string; activeClass: string }[] = [
                { value: "off", label: "Privé", icon: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88", activeClass: "bg-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] border-[var(--outline-variant)]/30" },
                ...(!g.noWings && g.wingsKey ? [{ value: "wings" as PrivacyOption, label: "Wings", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0z", activeClass: "bg-[var(--tertiary)]/15 text-[var(--tertiary)] border-[var(--tertiary)]/30" }] : []),
                { value: "public", label: "Public", icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418", activeClass: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30" },
              ];
              return (
                <div key={g.publicKey} className="p-3 rounded-xl hover:bg-[var(--surface-high)] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-high)] flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={g.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--on-surface)]">{g.label}</p>
                      <p className="text-[10px] text-[var(--outline)] mt-0.5 mb-2.5">{g.hint}</p>
                      <div className="flex gap-1.5">
                        {options.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setGroupValue(g, o.value)}
                            className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all font-medium ${
                              current === o.value ? o.activeClass : "bg-transparent text-[var(--outline)] border-transparent hover:bg-[var(--surface-bright)]"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
