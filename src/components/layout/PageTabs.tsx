"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
      { href: "/contacts", label: "Pipeline" },
      { href: "/sessions", label: "Sessions" },
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
      { href: "/progression", label: "Progression" },
      { href: "/reports", label: "Statistiques" },
      { href: "/journal", label: "Journal" },
      { href: "/missions", label: "Missions" },
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
  const router = useRouter();
  const groupKey = getGroup(pathname);
  const touchStart = useRef<number | null>(null);

  const group = groupKey ? TAB_GROUPS[groupKey] : null;

  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null || touchStartY.current === null || !group) return;
    const diffX = touchStart.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const threshold = 100; // Higher threshold to prevent accidental swipes

    touchStart.current = null;
    touchStartY.current = null;

    // Ignore if vertical movement is greater (user is scrolling, not swiping)
    if (Math.abs(diffY) > Math.abs(diffX) * 0.5) return;
    if (Math.abs(diffX) < threshold) return;

    const currentIdx = group.tabs.findIndex((t) => pathname.startsWith(t.href));
    if (currentIdx === -1) return;

    if (diffX > 0 && currentIdx < group.tabs.length - 1) {
      router.push(group.tabs[currentIdx + 1].href);
    } else if (diffX < 0 && currentIdx > 0) {
      router.push(group.tabs[currentIdx - 1].href);
    }
  }, [group, pathname, router]);

  if (!group) return null;

  return (
    <div
      className="lg:hidden flex justify-center gap-1.5 px-4 pb-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
