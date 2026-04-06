"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home", label: "Home", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "game", label: "Game", href: "/interactions", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", matchPaths: ["/interactions", "/sessions", "/contacts"] },
  { id: "social", label: "Social", href: "/wings", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z", matchPaths: ["/wings", "/messages", "/feed", "/leaderboard"] },
  { id: "moi", label: "Moi", href: "/progression", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", matchPaths: ["/progression", "/reports", "/journal", "/missions"] },
];

function getActiveTab(pathname: string): string {
  if (pathname === "/") return "home";
  for (const tab of TABS) {
    if (tab.matchPaths?.some((p) => pathname.startsWith(p))) return tab.id;
  }
  return "home";
}

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/landing") return null;

  const activeTab = getActiveTab(pathname);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-heavy border-t border-[var(--glass-border)] safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-[14px] transition-all min-w-[56px]",
                isActive ? "text-[var(--primary)]" : "text-[var(--outline-variant)]"
              )}
            >
              <svg
                className={cn("w-5 h-5 transition-all", isActive && "drop-shadow-[0_0_6px_var(--neon-purple)]")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="text-[9px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
