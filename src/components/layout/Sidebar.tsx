"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/interactions", label: "Interactions", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/sessions", label: "Sessions", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/contacts", label: "Pipeline", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/wings", label: "Wings", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/missions", label: "Missions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/progression", label: "Progression", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { href: "/journal", label: "Journal", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { href: "/reports", label: "Rapports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/settings", label: "Parametres", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login") return null;

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-[#100e17] border-r border-[rgba(192,132,252,0.06)]">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border-2 border-[#c084fc] flex items-center justify-center shadow-[0_0_12px_-2px_rgba(192,132,252,0.4)]">
            <Image src="/logo.png" alt="GameTrack" width={20} height={20} className="rounded-[4px]" />
          </div>
          <span className="text-[15px] font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] tracking-tight">GameTrack</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium tracking-wide transition-all duration-200",
                active
                  ? "text-[#f0eef5] bg-transparent font-semibold"
                  : "text-[#6b6580] hover:text-[#a09bb2] hover:bg-[rgba(192,132,252,0.04)]"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                active ? "bg-[#c084fc] shadow-[0_0_8px_rgba(192,132,252,0.6)]" : "bg-current opacity-50"
              )} />
              <svg className="w-[16px] h-[16px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {session?.user && (
        <div className="px-3 py-3 border-t border-[rgba(192,132,252,0.04)]">
          <div className="flex items-center gap-3 px-2">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#c084fc]/20 flex items-center justify-center text-[10px] font-bold text-[#c084fc]">
                {session.user.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#f0eef5] font-medium truncate">{session.user.name}</p>
              <p className="text-[9px] text-[#6b6580] truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="text-[#6b6580] hover:text-[#fb7185] transition-colors shrink-0"
              title="Deconnexion"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-[rgba(192,132,252,0.04)]">
        <div className="text-[9px] text-[#3d3650] text-center tracking-[2px] uppercase font-[family-name:var(--font-grotesk)]">v1.0 MVP</div>
      </div>
    </aside>
  );
}
