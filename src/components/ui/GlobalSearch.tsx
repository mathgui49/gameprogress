"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";

interface SearchResult {
  type: "interaction" | "contact" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const PAGES: SearchResult[] = [
  { type: "page", id: "dashboard", title: "Dashboard", href: "/" },
  { type: "page", id: "interactions", title: "Interactions", href: "/interactions" },
  { type: "page", id: "interactions-new", title: "Nouvelle interaction", href: "/interactions/new" },
  { type: "page", id: "contacts", title: "Contacts", href: "/contacts" },
  { type: "page", id: "sessions", title: "Sessions", href: "/sessions" },
  { type: "page", id: "journal", title: "Journal", href: "/journal" },
  { type: "page", id: "missions", title: "Missions", href: "/missions" },
  { type: "page", id: "wings", title: "Wings", href: "/wings" },
  { type: "page", id: "progression", title: "Progression", href: "/progression" },
  { type: "page", id: "leaderboard", title: "Leaderboard", href: "/leaderboard" },
  { type: "page", id: "feed", title: "Feed", href: "/feed" },
  { type: "page", id: "settings", title: "Parametres", href: "/settings" },
  { type: "page", id: "guide", title: "Guide", href: "/guide" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();

  // Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return PAGES.slice(0, 6);
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    // Search pages
    PAGES.forEach((p) => {
      if (p.title.toLowerCase().includes(q)) items.push(p);
    });

    // Search interactions (top 5)
    interactions
      .filter((i) =>
        (i.firstName || "").toLowerCase().includes(q) ||
        (i.memorableElement || "").toLowerCase().includes(q) ||
        (i.location || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((i) => {
        items.push({
          type: "interaction",
          id: i.id,
          title: i.firstName || "Interaction",
          subtitle: [i.location, new Date(i.date).toLocaleDateString("fr-FR")].filter(Boolean).join(" · "),
          href: `/interactions/${i.id}`,
        });
      });

    // Search contacts (top 5)
    contacts
      .filter((c) => (c.firstName || "").toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) => {
        items.push({
          type: "contact",
          id: c.id,
          title: c.firstName,
          subtitle: c.status,
          href: `/contacts/${c.id}`,
        });
      });

    return items.slice(0, 10);
  }, [query, interactions, contacts]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      navigate(results[selectedIdx].href);
    }
  };

  if (!open) return null;

  const typeIcons = {
    page: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z",
    interaction: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
    contact: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[90vw] max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg className="w-4 h-4 text-[var(--outline)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher pages, interactions, contacts..."
            className="flex-1 bg-transparent text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] text-[var(--outline)] bg-[var(--surface-high)] border border-[var(--border)] rounded">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--outline)]">Aucun resultat</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => navigate(r.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIdx ? "bg-[var(--primary)]/10" : "hover:bg-[var(--surface-high)]"
                }`}
              >
                <svg className="w-4 h-4 text-[var(--outline)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[r.type]} />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--on-surface)] truncate">{r.title}</p>
                  {r.subtitle && <p className="text-[10px] text-[var(--outline)] truncate">{r.subtitle}</p>}
                </div>
                <span className="text-[9px] text-[var(--outline)] uppercase tracking-wider shrink-0">
                  {r.type === "page" ? "Page" : r.type === "interaction" ? "Interaction" : "Contact"}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--outline)]">
          <span><kbd className="px-1 py-0.5 bg-[var(--surface-high)] border border-[var(--border)] rounded">↑↓</kbd> naviguer</span>
          <span><kbd className="px-1 py-0.5 bg-[var(--surface-high)] border border-[var(--border)] rounded">↵</kbd> ouvrir</span>
        </div>
      </div>
    </div>
  );
}
