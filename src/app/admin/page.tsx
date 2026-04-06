"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { adminGetStatsAction, adminGetAllProfilesAction, adminGetAllSessionsAction, adminDeleteUserAction, adminDeleteSessionAction, adminGetAnnouncementAction, adminSetAnnouncementAction, adminGetReportsAction, adminResolveReportAction, adminDeletePostAction, adminSendPushAction } from "@/actions/db";
import { formatDate, formatRelative } from "@/lib/utils";
import type { PublicProfile, Session } from "@/types";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

type AdminTab = "stats" | "users" | "sessions" | "announce" | "moderation" | "push";

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

  // Moderation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Push
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

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
    const [s, p, sess, ann, rep] = await Promise.all([
      adminGetStatsAction(),
      adminGetAllProfilesAction(),
      adminGetAllSessionsAction(),
      adminGetAnnouncementAction(),
      adminGetReportsAction(),
    ]);
    setStats(s);
    setProfiles(p as PublicProfile[]);
    setSessions(sess as (Session & { userId?: string })[]);
    setCurrentAnnouncement(ann);
    setAnnouncement(ann || "");
    setReports(rep);
    setLoaded(true);
  };

  const handleResolveReport = async (reportId: string) => {
    setResolvingId(reportId);
    await adminResolveReportAction(reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setResolvingId(null);
  };

  const handleDeletePostFromReport = async (postId: string, reportId: string) => {
    setResolvingId(reportId);
    await adminDeletePostAction(postId);
    // Remove all reports for this post
    setReports((prev) => prev.filter((r) => r.postId !== postId));
    setResolvingId(null);
  };

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const result = await adminSendPushAction(pushTitle.trim(), pushBody.trim(), pushUrl.trim() || undefined);
      setPushResult(result);
      setPushTitle("");
      setPushBody("");
      setPushUrl("");
    } catch (e: any) {
      setPushResult({ sent: 0, failed: 0, total: -1 });
    }
    setPushSending(false);
  };

  const handleDeleteUser = async (targetUserId: string) => {
    await adminDeleteUserAction(targetUserId);
    setProfiles((prev) => prev.filter((p) => p.userId !== targetUserId));
    setConfirmAction(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await adminDeleteSessionAction(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setConfirmAction(null);
  };

  const handleSetAnnouncement = async () => {
    const msg = announcement.trim() || null;
    await adminSetAnnouncementAction(msg);
    setCurrentAnnouncement(msg);
  };

  const handleClearAnnouncement = async () => {
    await adminSetAnnouncementAction(null);
    setCurrentAnnouncement(null);
    setAnnouncement("");
  };

  if (userId !== ADMIN_EMAIL) {
    return <div className="flex items-center justify-center h-screen"><p className="text-[#fb7185]">Accès refusé.</p></div>;
  }

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  const filteredProfiles = searchUser
    ? profiles.filter((p) => p.username?.toLowerCase().includes(searchUser.toLowerCase()) || p.firstName?.toLowerCase().includes(searchUser.toLowerCase()) || p.userId?.toLowerCase().includes(searchUser.toLowerCase()))
    : profiles;

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "stats", label: "Stats" },
    { key: "users", label: `Utilisateurs (${profiles.length})` },
    { key: "sessions", label: `Sessions (${sessions.length})` },
    { key: "announce", label: "Annonce" },
    { key: "moderation", label: `Signalements (${reports.length})` },
    { key: "push", label: "Push" },
  ];

  return (
    <div className="px-4 py-2 lg:px-8 lg:py-4 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] tracking-tight">Admin</h1>
          <Badge className="bg-[#fb7185]/15 text-[#fb7185]">Moderateur</Badge>
        </div>
        <p className="text-sm text-[var(--on-surface-variant)]">Panneau d&apos;administration GameProgress</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--surface-low)] rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs font-medium py-2.5 px-4 rounded-lg transition-all whitespace-nowrap ${tab === t.key ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Utilisateurs", value: stats.users, color: "text-[var(--primary)]" },
              { label: "Interactions", value: stats.interactions, color: "text-[var(--secondary)]" },
              { label: "Contacts", value: stats.contacts, color: "text-[var(--tertiary)]" },
              { label: "Sessions", value: stats.sessions, color: "text-cyan-400" },
              { label: "Posts journal", value: stats.journal_entries, color: "text-amber-400" },
              { label: "Posts", value: stats.posts, color: "text-emerald-400" },
              { label: "Missions", value: stats.missions, color: "text-[var(--primary)]" },
            ].map((s) => (
              <Card key={s.label} className="text-center !p-4">
                <p className={`text-2xl font-[family-name:var(--font-grotesk)] font-bold ${s.color}`}>{s.value ?? 0}</p>
                <p className="text-[10px] text-[var(--outline)] mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Derniers profils créés</h3>
            <div className="space-y-2">
              {profiles.slice(0, 10).map((p) => (
                <div key={p.userId} className="flex items-center justify-between py-1.5 border-b border-[rgba(192,132,252,0.04)] last:border-0">
                  <div>
                    <p className="text-xs text-[var(--on-surface)]">@{p.username || "—"} <span className="text-[var(--outline)]">({p.firstName || "—"})</span></p>
                    <p className="text-[10px] text-[var(--outline)]">{p.userId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--outline)]">{p.location || "—"}</p>
                    <p className="text-[10px] text-[var(--outline)]">{formatRelative(p.createdAt)}</p>
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
          <Input placeholder="Rechercher par username, prénom ou email..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
          <div className="space-y-2">
            {filteredProfiles.map((p) => (
              <Card key={p.userId} className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--primary)]">{p.firstName?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--on-surface)]">@{p.username || "—"} <span className="text-[var(--outline)]">({p.firstName})</span></p>
                      <p className="text-[10px] text-[var(--outline)]">{p.userId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.location && <span className="text-[10px] text-[var(--on-surface-variant)]">{p.location}</span>}
                        {p.isPublic && <Badge className="bg-emerald-400/15 text-emerald-400">Public</Badge>}
                        <span className="text-[10px] text-[var(--outline)]">{formatRelative(p.createdAt)}</span>
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
                  <p className="text-sm font-medium text-[var(--on-surface)]">{s.title || "Session"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--outline)]">
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
          {sessions.length === 0 && <p className="text-sm text-[var(--outline)] text-center py-8">Aucune session publique.</p>}
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
                  <p className="text-xs text-[var(--on-surface-variant)] mt-1">{currentAnnouncement}</p>
                </div>
                <Button size="sm" variant="danger" onClick={handleClearAnnouncement}>Retirer</Button>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Barre d&apos;annonce</h3>
            <p className="text-xs text-[var(--on-surface-variant)] mb-3">Ce message s&apos;affichera en haut de l&apos;app pour tous les utilisateurs.</p>
            <TextArea placeholder="Ex: Maintenance prévue ce soir à 22h..." rows={3} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleSetAnnouncement} disabled={!announcement.trim()}>Publier l&apos;annonce</Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODERATION */}
      {tab === "moderation" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-sm text-[var(--outline)] text-center py-8">Aucun signalement en attente.</p>}
          {reports.map((r: any) => (
            <Card key={r.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-[#fb7185]/15 text-[#fb7185]">Signalement</Badge>
                    <span className="text-[10px] text-[var(--outline)]">{formatRelative(r.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] mb-1"><span className="text-[var(--outline)]">Raison :</span> {r.reason || "—"}</p>
                  <p className="text-[10px] text-[var(--outline)]">Post ID: {r.postId}</p>
                  <p className="text-[10px] text-[var(--outline)]">Signalé par: {r.userId}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="danger" disabled={resolvingId === r.id}
                    onClick={() => handleDeletePostFromReport(r.postId, r.id)}>
                    Supprimer le post
                  </Button>
                  <Button size="sm" variant="ghost" disabled={resolvingId === r.id}
                    onClick={() => handleResolveReport(r.id)}>
                    Ignorer
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PUSH NOTIFICATIONS */}
      {tab === "push" && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--on-surface)] mb-1">Notification personnalisée</h3>
            <p className="text-xs text-[var(--on-surface-variant)] mb-4">Envoyer une notification push à tous les utilisateurs abonnés.</p>
            <div className="space-y-3">
              <Input placeholder="Titre de la notification" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
              <TextArea placeholder="Corps du message..." rows={3} value={pushBody} onChange={(e) => setPushBody(e.target.value)} />
              <Input placeholder="URL de redirection (optionnel, ex: /feed)" value={pushUrl} onChange={(e) => setPushUrl(e.target.value)} />
              <Button onClick={handleSendPush} disabled={pushSending || !pushTitle.trim() || !pushBody.trim()}>
                {pushSending ? "Envoi en cours..." : "Envoyer la notification"}
              </Button>
            </div>
            {pushResult && (
              <div className={`mt-3 p-3 rounded-lg text-xs ${pushResult.total === -1 ? "bg-[#fb7185]/10 text-[#fb7185]" : "bg-emerald-400/10 text-emerald-400"}`}>
                {pushResult.total === -1
                  ? "Erreur lors de l'envoi. Vérifiez que les clés VAPID sont configurées."
                  : `Envoyé: ${pushResult.sent} / ${pushResult.total} — Échoué: ${pushResult.failed}`
                }
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirmer l'action">
        {confirmAction && (
          <div>
            <p className="text-sm text-[var(--on-surface-variant)] mb-4">
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
