"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "game",
    label: "Game",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    children: [
      { href: "/interactions", label: "Interactions" },
      { href: "/sessions", label: "Sessions" },
      { href: "/contacts", label: "Pipeline" },
    ],
  },
  {
    id: "social",
    label: "Social",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
    children: [
      { href: "/wings", label: "Wings" },
      { href: "/feed", label: "Feed" },
      { href: "/leaderboard", label: "Classement" },
    ],
  },
  {
    id: "moi",
    label: "Moi",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    children: [
      { href: "/missions", label: "Missions" },
      { href: "/progression", label: "Progression" },
      { href: "/journal", label: "Journal" },
    ],
  },
];

// Determine which tab group a given path belongs to
function getActiveTab(pathname: string): string {
  if (pathname === "/") return "home";
  for (const tab of TABS) {
    if (tab.children?.some((c) => pathname.startsWith(c.href))) return tab.id;
  }
  return "home";
}

export function MobileNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (pathname === "/login" || pathname === "/landing") return null;

  const activeTab = getActiveTab(pathname);

  const handleTabClick = (tab: typeof TABS[number]) => {
    if (tab.href) return; // direct link (Home)
    if (expanded === tab.id) {
      setExpanded(null);
    } else {
      setExpanded(tab.id);
    }
  };

  return (
    <>
      {/* Sub-menu overlay */}
      {expanded && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-sm" onClick={() => setExpanded(null)} />
          <div className="absolute bottom-[72px] left-3 right-3 glass-card p-3 animate-slide-up z-50 safe-area-bottom">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {TABS.find((t) => t.id === expanded)?.children?.map((child) => {
                const active = pathname.startsWith(child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setExpanded(null)}
                    className={cn(
                      "pill-tab shrink-0",
                      active && "active"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-heavy border-t border-[var(--glass-border)] safe-area-bottom">
        <div className="flex items-center justify-around py-1.5 px-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isExpanded = expanded === tab.id;

            if (tab.href) {
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
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-[14px] transition-all min-w-[56px]",
                  (isActive || isExpanded) ? "text-[var(--primary)]" : "text-[var(--outline-variant)]"
                )}
              >
                <svg
                  className={cn("w-5 h-5 transition-all", (isActive || isExpanded) && "drop-shadow-[0_0_6px_var(--neon-purple)]")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span className="text-[9px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
