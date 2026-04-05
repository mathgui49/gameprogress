"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGamification } from "@/hooks/useGamification";
import { useWingRequests } from "@/hooks/useWingRequests";
import { adminGetAnnouncement } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { formatRelative } from "@/lib/utils";

export function TopBar() {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);
  const gam = useGamification();
  const { pendingReceived } = useWingRequests();

  useEffect(() => {
    adminGetAnnouncement().then(setAnnouncement);
  }, []);

  if (pathname === "/login") return null;

  // Build notifications from gamification events
  const notifications: { id: string; icon: string; text: string; date: string; color: string }[] = [];

  // Recent XP events
  gam.xpEvents.slice(0, 5).forEach((e) => {
    notifications.push({ id: `xp-${e.id}`, icon: "⚡", text: `+${e.amount} XP — ${e.reason}`, date: e.date, color: "text-[#c084fc]" });
  });

  // Recently unlocked badges
  gam.badges.filter((b) => b.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((b) => {
    notifications.push({ id: `badge-${b.id}`, icon: "🏅", text: `Badge debloque : ${b.name}`, date: b.unlockedAt!, color: "text-amber-400" });
  });

  // Recently unlocked milestones
  gam.milestones.filter((m) => m.unlockedAt).sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()).slice(0, 3).forEach((m) => {
    notifications.push({ id: `ms-${m.id}`, icon: "🎯", text: `Milestone atteint : ${m.name}`, date: m.unlockedAt!, color: "text-emerald-400" });
  });

  // Pending wing invitations
  pendingReceived.forEach((r) => {
    notifications.push({ id: `wing-${r.id}`, icon: "🤝", text: `Invitation wing recue`, date: r.createdAt, color: "text-[#818cf8]" });
  });

  notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const notifCount = pendingReceived.length + gam.xpEvents.filter((e) => {
    const d = new Date(e.date);
    return Date.now() - d.getTime() < 24 * 3600 * 1000;
  }).length;

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
      <div className="flex items-center justify-end gap-2 px-4 pt-4 lg:px-8 lg:pt-6">
        <Link
          href="/calendrier"
          className={`relative p-2 rounded-xl transition-colors ${pathname === "/calendrier" ? "bg-[#c084fc]/15 text-[#c084fc]" : "text-[#6b6580] hover:text-[#a09bb2] hover:bg-[rgba(192,132,252,0.04)]"}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </Link>
        <button
          onClick={() => setShowNotifs(true)}
          className="relative p-2 rounded-xl text-[#6b6580] hover:text-[#a09bb2] hover:bg-[rgba(192,132,252,0.04)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#fb7185] text-[8px] font-bold text-white flex items-center justify-center">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
      </div>

      <Modal open={showNotifs} onClose={() => setShowNotifs(false)} title="Notifications">
        {notifications.length === 0 ? (
          <p className="text-sm text-[#6b6580] text-center py-4">Aucune notification.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {notifications.slice(0, 20).map((n) => (
              <Card key={n.id} className="!p-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${n.color}`}>{n.text}</p>
                    <p className="text-[10px] text-[#6b6580]">{formatRelative(n.date)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
