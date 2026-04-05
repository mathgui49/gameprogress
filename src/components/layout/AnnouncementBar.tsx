"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { fetchAnnouncementAction } from "@/actions/db";

export function AnnouncementBar() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAnnouncementAction().then(setAnnouncement);
  }, []);

  if (pathname === "/login" || pathname === "/landing" || !announcement || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-400/10 border-b border-amber-400/20">
      <span className="text-amber-400 text-sm">📢</span>
      <p className="flex-1 text-xs text-amber-400 font-medium">{announcement}</p>
      <button onClick={() => setDismissed(true)} className="text-amber-400/60 hover:text-amber-400 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
