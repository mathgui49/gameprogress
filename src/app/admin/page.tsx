"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { adminGetStats, adminGetAllProfiles, adminGetAllSessions, adminDeleteUser, adminDeleteSession, adminGetAnnouncement, adminSetAnnouncement } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import type { PublicProfile, Session } from "@/types";

const ADMIN_EMAIL = "mathieu.guicheteau7@gmail.com";

type AdminTab = "stats" | "users" | "sessions" | "announce";

export default function AdminPage() {
  const { data: authSession } = useSession();
  const router = useRouter();
  const userId = authSession?.user?.email ?? "";

  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [sessions, setSessions] = useState<(Session & { userId?: string })[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [searchUser, setSearchUser] = useState("");

  // Auth guard
  useEffect(() => {
    if (authSession && userId !== ADMIN_EMAIL) {
      router.push("/");
    }
  }, [authSession, userId, router]);

  // Load data
  useEffect(() => {
    if (userId !== ADMIN_EMAIL) return;
    loadAll();
  }, [userId]);

  const loadAll = async () => {
    const [s, p, sess, ann] = await Promise.all([
      adminGetStats(),
      adminGetAllProfiles(),
      adminGetAllSessions(),
      adminGetAnnouncement(),
    ]);
    setStats(s);
    setProfiles(p as PublicProfile[]);
    setSessions(sess as (Session & { userId?: string })[]);
    setCurrentAnnouncement(ann);
    setAnnouncement(ann || "");
    setLoaded(true);
  };

  const handleDeleteUser = async (targetUserId: string) => {
    await adminDeleteUser(targetUserId);
    setProfiles((prev) => prev.filter((p) => p.userId !== targetUserId));
    setConfirmAction(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await adminDeleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setConfirmAction(null);
  };

  const handleSetAnnouncement = async () => {
    const msg = announcement.trim() || null;
    await adminSetAnnouncement(msg);
    setCurrentAnnouncement(msg);
  };

  const handleClearAnnouncement = async () => {
    await adminSetAnnouncement(null);
    setCurrentAnnouncement(null);
    setAnnouncement("");
  };

  if (userId !== ADMIN_EMAIL) {
    return <div className="flex items-center justify-center h-screen"><p className="text-[#fb7185]">Acces refuse.</p></div>;
  }

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>;

  const filteredProfiles = searchUser
    ? profiles.filter((p) => p.username?.toLowerCase().includes(searchUser.toLowerCase()) || p.firstName?.toLowerCase().includes(searchUser.toLowerCase()) || p.userId?.toLowerCase().includes(searchUser.toLowerCase()))
    : profiles;

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "stats", label: "Stats" },
    { key: "users", label: `Utilisateurs (${profiles.length})` },
    { key: "sessions", label: `Sessions (${sessions.length})` },
    { key: "announce", label: "Annonce" },
  ];

  return (
    <div className="px-4 py-2 lg:px-8 lg:py-4 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-white tracking-tight">Admin</h1>
          <Badge className="bg-[#fb7185]/15 text-[#fb7185]">Moderateur</Badge>
        </div>
        <p className="text-sm text-[#a09bb2]">Panneau d&apos;administration GameTrack</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#14111c] rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs font-medium py-2.5 px-4 rounded-lg transition-all whitespace-nowrap ${tab === t.key ? "bg-[#c084fc]/15 text-[#c084fc]" : "text-[#6b6580] hover:text-[#a09bb2]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Utilisateurs", value: stats.users, color: "text-[#c084fc]" },
              { label: "Interactions", value: stats.interactions, color: "text-[#f472b6]" },
              { label: "Contacts", value: stats.contacts, color: "text-[#818cf8]" },
              { label: "Sessions", value: stats.sessions, color: "text-cyan-400" },
              { label: "Entrees journal", value: stats.journal_entries, color: "text-amber-400" },
              { label: "Posts", value: stats.posts, color: "text-emerald-400" },
              { label: "Missions", value: stats.missions, color: "text-[#c084fc]" },
            ].map((s) => (
              <Card key={s.label} className="text-center !p-4">
                <p className={`text-2xl font-[family-name:var(--font-grotesk)] font-bold ${s.color}`}>{s.value ?? 0}</p>
                <p className="text-[10px] text-[#6b6580] mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Derniers profils crees</h3>
            <div className="space-y-2">
              {profiles.slice(0, 10).map((p) => (
                <div key={p.userId} className="flex items-center justify-between py-1.5 border-b border-[rgba(192,132,252,0.04)] last:border-0">
                  <div>
                    <p className="text-xs text-white">@{p.username || "—"} <span className="text-[#6b6580]">({p.firstName || "—"})</span></p>
                    <p className="text-[10px] text-[#6b6580]">{p.userId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#6b6580]">{p.location || "—"}</p>
                    <p className="text-[10px] text-[#6b6580]">{formatRelative(p.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div className="space-y-4">
          <Input placeholder="Rechercher par username, prenom ou email..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
          <div className="space-y-2">
            {filteredProfiles.map((p) => (
              <Card key={p.userId} className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#c084fc]">{p.firstName?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">@{p.username || "—"} <span className="text-[#6b6580]">({p.firstName})</span></p>
                      <p className="text-[10px] text-[#6b6580]">{p.userId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.location && <span className="text-[10px] text-[#a09bb2]">{p.location}</span>}
                        {p.isPublic && <Badge className="bg-emerald-400/15 text-emerald-400">Public</Badge>}
                        <span className="text-[10px] text-[#6b6580]">{formatRelative(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: "delete_user", id: p.userId, label: `@${p.username || p.userId}` })}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SESSIONS */}
      {tab === "sessions" && (
        <div className="space-y-2">
          {sessions.map((s: any) => (
            <Card key={s.id} className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{s.title || "Session"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[#6b6580]">
                    <span>{s.location}</span>
                    <span>{formatDate(s.date)}</span>
                    <span>par {s.userId}</span>
                  </div>
                </div>
                <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: "delete_session", id: s.id, label: s.title || "Session" })}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
          {sessions.length === 0 && <p className="text-sm text-[#6b6580] text-center py-8">Aucune session publique.</p>}
        </div>
      )}

      {/* ANNOUNCEMENT */}
      {tab === "announce" && (
        <div className="space-y-4">
          {currentAnnouncement && (
            <Card className="!border-amber-400/20">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg">📢</span>
                <div className="flex-1">
                  <p className="text-sm text-amber-400 font-medium">Annonce active</p>
                  <p className="text-xs text-[#a09bb2] mt-1">{currentAnnouncement}</p>
                </div>
                <Button size="sm" variant="danger" onClick={handleClearAnnouncement}>Retirer</Button>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Barre d&apos;annonce</h3>
            <p className="text-xs text-[#a09bb2] mb-3">Ce message s&apos;affichera en haut de l&apos;app pour tous les utilisateurs.</p>
            <TextArea placeholder="Ex: Maintenance prevue ce soir a 22h..." rows={3} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleSetAnnouncement} disabled={!announcement.trim()}>Publier l&apos;annonce</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirmer l'action">
        {confirmAction && (
          <div>
            <p className="text-sm text-[#a09bb2] mb-4">
              {confirmAction.type === "delete_user"
                ? `Supprimer toutes les donnees de ${confirmAction.label} ? Cette action est irreversible.`
                : `Supprimer la session "${confirmAction.label}" ? Cette action est irreversible.`
              }
            </p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => {
                if (confirmAction.type === "delete_user") handleDeleteUser(confirmAction.id);
                else handleDeleteSession(confirmAction.id);
              }}>
                Confirmer
              </Button>
              <Button variant="ghost" onClick={() => setConfirmAction(null)}>Annuler</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
