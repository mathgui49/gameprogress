"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useGamification } from "@/hooks/useGamification";
import { useWingRequests } from "@/hooks/useWingRequests";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useMessages } from "@/hooks/useMessages";
import { fetchSessionInvitesForUserAction, updateSessionInviteStatusAction, fetchProfilesByIdsAction } from "@/actions/db";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
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
  icon: string; // SVG path
  text: string;
  date: string;
  color: string;
  action?: React.ReactNode;
}

const ACCOUNT_MENU = [
  { href: "/profil", label: "Profil", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { href: "/settings", label: "Paramètres", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/reports", label: "Rapports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/guide", label: "Guide", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { href: "/referral", label: "Parrainage", icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" },
];

// SVG icon paths for notification types (no emojis)
const NOTIF_ICONS: Record<string, string> = {
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  xp: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  badge: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  milestone: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  wing: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
};

// Section title mapping for mobile header (shows group name, not page name)
const SECTION_TITLES: { paths: string[]; title: string }[] = [
  { paths: ["/interactions", "/sessions", "/contacts"], title: "Game" },
  { paths: ["/wings", "/feed", "/leaderboard", "/messages"], title: "Social" },
  { paths: ["/missions", "/progression", "/journal"], title: "Moi" },
];

// Standalone page titles (for pages not in a tab group)
const STANDALONE_TITLES: Record<string, string> = {
  "/": "Home",
  "/calendrier": "Calendrier",
  "/profil": "Profil",
  "/settings": "Paramètres",
  "/reports": "Rapports",
  "/admin": "Admin",
};

function getMobileTitle(pathname: string): string {
  // Check section groups first
  for (const section of SECTION_TITLES) {
    if (section.paths.some((p) => pathname.startsWith(p))) return section.title;
  }
  // Standalone pages
  if (STANDALONE_TITLES[pathname]) return STANDALONE_TITLES[pathname];
  for (const [path, title] of Object.entries(STANDALONE_TITLES)) {
    if (pathname.startsWith(path + "/")) return title;
  }
  return "GameProgress";
}

export function TopBar() {
  const pathname = usePathname();
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [sessionInvites, setSessionInvites] = useState<SessionInvite[]>([]);
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(new Set());
  const [readNotifs, setReadNotifs] = useState(false);
  const gam = useGamification();
  const { pendingReceived } = useWingRequests();
  const { profile: publicProfile } = usePublicProfile();
  const { totalUnread: msgUnread } = useMessages();

  // Use profile photo from public profile, fall back to Google auth image
  const avatarUrl = publicProfile?.profilePhoto || authSession?.user?.image || null;
  const avatarInitial = publicProfile?.firstName?.[0]?.toUpperCase() || authSession?.user?.name?.[0]?.toUpperCase() || "?";

  const loadSessionInvites = useCallback(async () => {
    if (!userId) return;
    const invites = await fetchSessionInvitesForUserAction();
    const pending = invites.filter((i: SessionInvite) => i.status === "pending");
    if (pending.length === 0) { setSessionInvites([]); return; }

    const sessionIds = pending.map((i: SessionInvite) => i.sessionId);
    const ownerIds = [...new Set(pending.map((i: SessionInvite) => i.ownerUserId))];

    const { fetchSessionsByIdsAction } = await import("@/actions/db");
    const [sessionsData, profiles] = await Promise.all([
      fetchSessionsByIdsAction(sessionIds),
      fetchProfilesByIdsAction(ownerIds),
    ]);

    const sessMap: Record<string, Session> = {};
    (sessionsData || []).forEach((s: any) => { sessMap[s.id] = s; });
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
    await updateSessionInviteStatusAction(inviteId, status);
    setSessionInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const dismissNotif = (id: string) => {
    setDismissedNotifs((prev) => new Set(prev).add(id));
  };

  const markAllRead = () => {
    setReadNotifs(true);
  };

  if (pathname === "/login" || pathname === "/landing") return null;

  // Build notifications (NO emojis — SVG icons only)
  const allNotifications: Notification[] = [];

  sessionInvites.forEach((inv) => {
    const ownerName = inv.ownerProfile?.username || inv.ownerProfile?.firstName || "Un wing";
    const sessionTitle = inv.session?.title || "une session";
    allNotifications.push({
      id: `sinv-${inv.id}`,
      icon: NOTIF_ICONS.calendar,
      text: `@${ownerName} t'invite à "${sessionTitle}"`,
      date: inv.createdAt,
      color: "text-cyan-400",
      action: (
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={() => handleInviteResponse(inv.id, "accepted")}>Accepter</Button>
          <Button size="sm" variant="ghost" onClick={() => handleInviteResponse(inv.id, "declined")}>Décliner</Button>
        </div>
      ),
    });
  });

  gam.xpEvents.slice(0, 5).forEach((e) => {
    allNotifications.push({ id: `xp-${e.id}`, icon: NOTIF_ICONS.xp, text: `+${e.amount} XP — ${e.reason}`, date: e.date, color: "text-[var(--primary)]" });
  });

  gam.badges.filter((b) => b.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((b) => {
    allNotifications.push({ id: `badge-${b.id}`, icon: NOTIF_ICONS.badge, text: `Badge débloqué : ${b.name}`, date: b.unlockedAt!, color: "text-[var(--secondary)]" });
  });

  gam.milestones.filter((m) => m.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((m) => {
    allNotifications.push({ id: `ms-${m.id}`, icon: NOTIF_ICONS.milestone, text: `Milestone atteint : ${m.name}`, date: m.unlockedAt!, color: "text-emerald-400" });
  });

  pendingReceived.forEach((r) => {
    allNotifications.push({ id: `wing-${r.id}`, icon: NOTIF_ICONS.wing, text: `Invitation wing reçue`, date: r.createdAt, color: "text-[var(--tertiary)]" });
  });

  allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const notifications = allNotifications.filter((n) => !dismissedNotifs.has(n.id));

  const notifCount = readNotifs ? 0 : (sessionInvites.length + pendingReceived.length + gam.xpEvents.filter((e) => {
    const d = new Date(e.date);
    return Date.now() - d.getTime() < 24 * 3600 * 1000;
  }).length);

  const pageTitle = getMobileTitle(pathname);

  return (
    <>
      {/* ═══ Mobile Header: logo | title | icons ═══ */}
      <div className="lg:hidden grid grid-cols-[auto_1fr_auto] items-center px-4 pt-4 pb-2">
        {/* Left: Logo — links to landing page */}
        <div className="flex items-center">
          <Link href="/landing">
            <div className="w-8 h-8 rounded-[10px] border border-[var(--primary)]/30 flex items-center justify-center animate-logo-pulse">
              <Image src="/logo.webp" alt="GameProgress" width={20} height={20} className="rounded-[5px]" priority />
            </div>
          </Link>
        </div>

        {/* Center: Page title */}
        <h1 className="text-[15px] font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] tracking-tight truncate text-center">
          {pageTitle}
        </h1>

        {/* Right: Icons */}
        <div className="flex items-center gap-0.5 justify-end">
          <Link
            href="/messages"
            aria-label="Messages"
            className="relative p-2 rounded-[12px] text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {msgUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--primary)] text-[8px] font-bold text-white flex items-center justify-center">
                {msgUnread > 9 ? "9+" : msgUnread}
              </span>
            )}
          </Link>
          <button
            onClick={() => { setShowNotifs(true); markAllRead(); }}
            aria-label="Notifications"
            className="relative p-2 rounded-[12px] text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--error)] text-[8px] font-bold text-white flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {authSession?.user && (
            <button
              onClick={() => setShowAccount(!showAccount)}
              aria-label="Mon compte"
              className="relative p-1 rounded-[12px] hover:bg-[var(--border)] transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                  {avatarInitial}
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Desktop TopBar: right-aligned icons ═══ */}
      <div className="hidden lg:flex items-center justify-end gap-1 px-8 pt-6">
        <Tooltip text="Messages" position="bottom">
          <Link
            href="/messages"
            aria-label="Messages"
            className={`relative p-2 rounded-[12px] transition-colors ${pathname === "/messages" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)]"}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {msgUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--primary)] text-[8px] font-bold text-white flex items-center justify-center">
                {msgUnread > 9 ? "9+" : msgUnread}
              </span>
            )}
          </Link>
        </Tooltip>

        <Tooltip text="Calendrier" position="bottom">
          <Link
            href="/calendrier"
            aria-label="Calendrier"
            className={`relative p-2 rounded-[12px] transition-colors ${pathname === "/calendrier" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)]"}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </Link>
        </Tooltip>

        <Tooltip text="Notifications" position="bottom">
          <button
            onClick={() => { setShowNotifs(true); markAllRead(); }}
            aria-label="Notifications"
            className="relative p-2 rounded-[12px] text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--border)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--error)] text-[8px] font-bold text-white flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>
        </Tooltip>

        {authSession?.user && (
          <Tooltip text="Mon compte" position="bottom">
            <button
              onClick={() => setShowAccount(!showAccount)}
              aria-label="Mon compte"
              className="relative p-1 rounded-[12px] hover:bg-[var(--border)] transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                  {avatarInitial}
                </div>
              )}
            </button>
          </Tooltip>
        )}
      </div>

      {/* Account dropdown — glass style */}
      {showAccount && authSession?.user && (
        <div className="fixed inset-0 z-50" onClick={() => setShowAccount(false)}>
          <div className="absolute top-14 right-4 lg:right-8 glass-card p-4 w-64 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            {/* User info */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--glass-border)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                  {avatarInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--on-surface)] font-medium truncate">{authSession.user.name}</p>
                <p className="text-[10px] text-[var(--outline)] truncate">{authSession.user.email}</p>
              </div>
            </div>

            {/* Menu links */}
            <div className="space-y-0.5 mb-3 pb-3 border-b border-[var(--glass-border)]">
              {ACCOUNT_MENU.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowAccount(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-[12px] text-sm transition-colors ${active ? "text-[var(--primary)] bg-[var(--border)]" : "text-[var(--on-surface-variant)] hover:bg-[var(--border)] hover:text-[var(--on-surface)]"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Admin */}
            {userId === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <div className="mb-3 pb-3 border-b border-[var(--glass-border)]">
                <Link
                  href="/admin"
                  onClick={() => setShowAccount(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[12px] text-sm transition-colors ${pathname === "/admin" ? "text-[var(--primary)] bg-[var(--border)]" : "text-[var(--on-surface-variant)] hover:bg-[var(--border)] hover:text-[var(--on-surface)]"}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Admin
                </Link>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="flex items-center gap-3 w-full text-left text-sm text-[var(--error)] hover:bg-[var(--error)]/10 rounded-[12px] px-3 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* ═══ Notifications modal — Premium glass ═══ */}
      <Modal open={showNotifs} onClose={() => setShowNotifs(false)} title="Notifications">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-high)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm text-[var(--outline)]">Aucune notification.</p>
          </div>
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
              <Card key={n.id} glass className="!p-3 relative group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-high)] flex items-center justify-center shrink-0">
                    <svg className={`w-4 h-4 ${n.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${n.color}`}>{n.text}</p>
                    <p className="text-[10px] text-[var(--outline)] mt-0.5">{formatRelative(n.date)}</p>
                    {n.action}
                  </div>
                  {!n.action && (
                    <button
                      onClick={() => dismissNotif(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--outline)] hover:text-[var(--on-surface-variant)] transition-all shrink-0"
                      aria-label="Supprimer la notification"
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
