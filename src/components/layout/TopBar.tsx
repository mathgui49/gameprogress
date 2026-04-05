"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useGamification } from "@/hooks/useGamification";
import { useWingRequests } from "@/hooks/useWingRequests";
import { adminGetAnnouncement, fetchSessionInvitesForUser, updateSessionInviteStatus, fetchProfilesByIds } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRelative } from "@/lib/utils";
import type { Session } from "@/types";

interface SessionInvite {
  id: string;
  sessionId: string;
  userId: string;
  ownerUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  session?: Session;
  ownerProfile?: { username: string; firstName: string };
}

interface Notification {
  id: string;
  icon: string;
  text: string;
  date: string;
  color: string;
  action?: React.ReactNode;
}

const ACCOUNT_MENU = [
  { href: "/profil", label: "Profil", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { href: "/settings", label: "Parametres", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/reports", label: "Rapports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

export function TopBar() {
  const pathname = usePathname();
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);
  const [sessionInvites, setSessionInvites] = useState<SessionInvite[]>([]);
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(new Set());
  const [readNotifs, setReadNotifs] = useState(false);
  const gam = useGamification();
  const { pendingReceived } = useWingRequests();

  useEffect(() => {
    adminGetAnnouncement().then(setAnnouncement);
  }, []);

  const loadSessionInvites = useCallback(async () => {
    if (!userId) return;
    const invites = await fetchSessionInvitesForUser(userId);
    const pending = invites.filter((i: SessionInvite) => i.status === "pending");
    if (pending.length === 0) { setSessionInvites([]); return; }

    const sessionIds = pending.map((i: SessionInvite) => i.sessionId);
    const ownerIds = [...new Set(pending.map((i: SessionInvite) => i.ownerUserId))];

    const [sessionsRes, profiles] = await Promise.all([
      supabase.from("sessions").select("*").in("id", sessionIds),
      fetchProfilesByIds(ownerIds),
    ]);

    const sessMap: Record<string, Session> = {};
    (sessionsRes.data || []).forEach((r: any) => { sessMap[r.id] = fromRow<Session>(r); });
    const profMap: Record<string, any> = {};
    profiles.forEach((p: any) => { profMap[p.userId] = p; });

    setSessionInvites(
      pending.map((i: SessionInvite) => ({
        ...i,
        session: sessMap[i.sessionId],
        ownerProfile: profMap[i.ownerUserId],
      }))
    );
  }, [userId]);

  useEffect(() => { loadSessionInvites(); }, [loadSessionInvites]);

  const handleInviteResponse = async (inviteId: string, status: "accepted" | "declined") => {
    await updateSessionInviteStatus(inviteId, status);
    setSessionInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const dismissNotif = (id: string) => {
    setDismissedNotifs((prev) => new Set(prev).add(id));
  };

  const markAllRead = () => {
    setReadNotifs(true);
  };

  if (pathname === "/login") return null;

  // Build notifications
  const allNotifications: Notification[] = [];

  sessionInvites.forEach((inv) => {
    const ownerName = inv.ownerProfile?.username || inv.ownerProfile?.firstName || "Un wing";
    const sessionTitle = inv.session?.title || "une session";
    allNotifications.push({
      id: `sinv-${inv.id}`,
      icon: "📅",
      text: `@${ownerName} t'invite a "${sessionTitle}"`,
      date: inv.createdAt,
      color: "text-cyan-400",
      action: (
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={() => handleInviteResponse(inv.id, "accepted")}>Accepter</Button>
          <Button size="sm" variant="ghost" onClick={() => handleInviteResponse(inv.id, "declined")}>Decliner</Button>
        </div>
      ),
    });
  });

  gam.xpEvents.slice(0, 5).forEach((e) => {
    allNotifications.push({ id: `xp-${e.id}`, icon: "⚡", text: `+${e.amount} XP — ${e.reason}`, date: e.date, color: "text-[var(--primary)]" });
  });

  gam.badges.filter((b) => b.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((b) => {
    allNotifications.push({ id: `badge-${b.id}`, icon: "🏅", text: `Badge debloque : ${b.name}`, date: b.unlockedAt!, color: "text-amber-400" });
  });

  gam.milestones.filter((m) => m.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((m) => {
    allNotifications.push({ id: `ms-${m.id}`, icon: "🎯", text: `Milestone atteint : ${m.name}`, date: m.unlockedAt!, color: "text-emerald-400" });
  });

  pendingReceived.forEach((r) => {
    allNotifications.push({ id: `wing-${r.id}`, icon: "🤝", text: `Invitation wing recue`, date: r.createdAt, color: "text-[var(--tertiary)]" });
  });

  allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const notifications = allNotifications.filter((n) => !dismissedNotifs.has(n.id));

  const notifCount = readNotifs ? 0 : (sessionInvites.length + pendingReceived.length + gam.xpEvents.filter((e) => {
    const d = new Date(e.date);
    return Date.now() - d.getTime() < 24 * 3600 * 1000;
  }).length);

  return (
    <>
      {announcement && !dismissedAnnouncement && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-400/10 border-b border-amber-400/20">
          <span className="text-amber-400 text-sm">📢</span>
          <p className="flex-1 text-xs text-amber-400 font-medium">{announcement}</p>
          <button onClick={() => setDismissedAnnouncement(true)} className="text-amber-400/60 hover:text-amber-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 px-4 pt-4 lg:px-8 lg:pt-6">
        <Link
          href="/calendrier"
          title="Calendrier"
          className={`relative p-2 rounded-xl transition-colors ${pathname === "/calendrier" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)]"}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </Link>

        <button
          onClick={() => { setShowNotifs(true); markAllRead(); }}
          title="Notifications"
          className="relative p-2 rounded-xl text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--error)] text-[8px] font-bold text-[var(--on-surface)] flex items-center justify-center">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>

        {/* Account avatar */}
        {authSession?.user && (
          <button
            onClick={() => setShowAccount(!showAccount)}
            className="relative p-1 rounded-xl hover:bg-[var(--border)] transition-colors"
          >
            {authSession.user.image ? (
              <img src={authSession.user.image} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                {authSession.user.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Account dropdown */}
      {showAccount && authSession?.user && (
        <div className="fixed inset-0 z-50" onClick={() => setShowAccount(false)}>
          <div className="absolute top-14 right-4 lg:right-8 bg-[var(--surface)] border border-[var(--border-hover)] rounded-xl p-4 w-64 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            {/* User info */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--border)]">
              {authSession.user.image ? (
                <img src={authSession.user.image} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                  {authSession.user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--on-surface)] font-medium truncate">{authSession.user.name}</p>
                <p className="text-[10px] text-[var(--outline)] truncate">{authSession.user.email}</p>
              </div>
            </div>

            {/* Menu links */}
            <div className="space-y-0.5 mb-3 pb-3 border-b border-[var(--border)]">
              {ACCOUNT_MENU.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowAccount(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "text-[var(--primary)] bg-[var(--border)]" : "text-[var(--on-surface-variant)] hover:bg-[var(--border)] hover:text-[var(--on-surface)]"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="flex items-center gap-3 w-full text-left text-sm text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Deconnexion
            </button>
          </div>
        </div>
      )}

      {/* Notifications modal */}
      <Modal open={showNotifs} onClose={() => setShowNotifs(false)} title="Notifications">
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--outline)] text-center py-4">Aucune notification.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {notifications.length > 1 && (
              <button
                onClick={() => { notifications.forEach((n) => dismissNotif(n.id)); }}
                className="text-[10px] text-[var(--outline)] hover:text-[var(--on-surface-variant)] transition-colors mb-1"
              >
                Tout effacer
              </button>
            )}
            {notifications.slice(0, 20).map((n) => (
              <Card key={n.id} className="!p-3 relative group">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${n.color}`}>{n.text}</p>
                    <p className="text-[10px] text-[var(--outline)]">{formatRelative(n.date)}</p>
                    {n.action}
                  </div>
                  {!n.action && (
                    <button
                      onClick={() => dismissNotif(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--outline)] hover:text-[var(--on-surface-variant)] transition-all shrink-0"
                      title="Supprimer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
