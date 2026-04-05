"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
}

const TAB_GROUPS: Record<string, { title: string; tabs: TabItem[] }> = {
  game: {
    title: "Game",
    tabs: [
      { href: "/interactions", label: "Interactions" },
      { href: "/sessions", label: "Sessions" },
      { href: "/contacts", label: "Pipeline" },
    ],
  },
  social: {
    title: "Social",
    tabs: [
      { href: "/wings", label: "Wings" },
      { href: "/feed", label: "Feed" },
      { href: "/leaderboard", label: "Classement" },
    ],
  },
  moi: {
    title: "Moi",
    tabs: [
      { href: "/missions", label: "Missions" },
      { href: "/progression", label: "Progression" },
      { href: "/journal", label: "Journal" },
    ],
  },
};

function getGroup(pathname: string): string | null {
  for (const [key, group] of Object.entries(TAB_GROUPS)) {
    if (group.tabs.some((t) => pathname.startsWith(t.href))) return key;
  }
  return null;
}

export function PageTabs() {
  const pathname = usePathname();
  const groupKey = getGroup(pathname);

  if (!groupKey) return null;

  const group = TAB_GROUPS[groupKey];

  return (
    <div className="lg:hidden flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
      {group.tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "pill-tab shrink-0",
              active && "active"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
