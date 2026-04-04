"use client";

import { useState } from "react";
import Link from "next/link";

const ACTIONS = [
  { href: "/interactions/new", label: "Interaction", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/contacts?new=1", label: "Contact", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  { href: "/journal?new=1", label: "Journal", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { href: "/missions?new=1", label: "Mission", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
];

export function QuickAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-30">
      {/* Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 animate-scale-in">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 bg-[#1a191b] border-t border-white/[0.06] rounded-xl text-sm text-[#adaaab] hover:text-white hover:bg-[#201f21] transition-all shadow-[0_24px_48px_rgba(0,0,0,0.4)] whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-[#85adff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
              {a.label}
            </Link>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-14 h-14 rounded-2xl bg-gradient-to-br from-[#85adff] to-[#ac8aff] flex items-center justify-center shadow-lg shadow-[#85adff]/20 hover:shadow-[#85adff]/30 hover:scale-105 transition-all duration-200",
          open && "rotate-45"
        )}
      >
        <svg className="w-7 h-7 text-white transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(" "); }
