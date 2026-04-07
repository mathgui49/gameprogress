"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useInteractions } from "@/hooks/useInteractions";
import { useContacts } from "@/hooks/useContacts";
import { useWings } from "@/hooks/useWings";
import { useSessions } from "@/hooks/useSessions";
import { STATUS_LABELS } from "@/types";

interface SearchResult {
  type: "interaction" | "contact" | "wing" | "session" | "page" | "faq";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const PAGES: SearchResult[] = [
  { type: "page", id: "dashboard", title: "Dashboard", subtitle: "Page d'accueil", href: "/" },
  { type: "page", id: "interactions", title: "Interactions", subtitle: "Historique des approches", href: "/interactions" },
  { type: "page", id: "interactions-new", title: "Nouvelle interaction", subtitle: "Enregistrer une approche", href: "/interactions/new" },
  { type: "page", id: "contacts", title: "Pipeline", subtitle: "Gestion des contacts", href: "/contacts" },
  { type: "page", id: "sessions", title: "Sessions", subtitle: "Sorties et events", href: "/sessions" },
  { type: "page", id: "sessions-new", title: "Nouvelle session", subtitle: "Planifier une sortie", href: "/sessions/new" },
  { type: "page", id: "journal", title: "Journal", subtitle: "Notes et réflexions", href: "/journal" },
  { type: "page", id: "missions", title: "Missions", subtitle: "Objectifs et défis", href: "/missions" },
  { type: "page", id: "wings", title: "Wings", subtitle: "Partenaires de sortie", href: "/wings" },
  { type: "page", id: "progression", title: "Progression", subtitle: "XP, niveaux et badges", href: "/progression" },
  { type: "page", id: "leaderboard", title: "Classement", subtitle: "Leaderboard", href: "/leaderboard" },
  { type: "page", id: "feed", title: "Feed", subtitle: "Publications communautaires", href: "/feed" },
  { type: "page", id: "messages", title: "Messages", subtitle: "Messagerie privée", href: "/messages" },
  { type: "page", id: "calendrier", title: "Calendrier", subtitle: "Vue calendrier", href: "/calendrier" },
  { type: "page", id: "reports", title: "Statistiques", subtitle: "Analytics et rapports", href: "/reports" },
  { type: "page", id: "settings", title: "Paramètres", subtitle: "Configuration du compte", href: "/settings" },
  { type: "page", id: "guide", title: "Guide", subtitle: "Aide et tutoriels", href: "/guide" },
  { type: "page", id: "faq", title: "FAQ", subtitle: "Questions fréquentes", href: "/faq" },
  { type: "page", id: "profil", title: "Profil", subtitle: "Mon profil", href: "/profil" },
  { type: "page", id: "referral", title: "Parrainage", subtitle: "Inviter des amis", href: "/referral" },
  { type: "page", id: "abonnement", title: "Abonnement", subtitle: "Plans et tarifs", href: "/abonnement" },
];

const FAQ_ENTRIES: SearchResult[] = [
  { type: "faq", id: "faq-xp", title: "Comment fonctionne le système d'XP ?", subtitle: "Gamification", href: "/faq" },
  { type: "faq", id: "faq-pipeline", title: "Comment fonctionne le pipeline CRM ?", subtitle: "Fonctionnalités", href: "/faq" },
  { type: "faq", id: "faq-install", title: "Comment installer l'app sur mon téléphone ?", subtitle: "Général", href: "/faq" },
  { type: "faq", id: "faq-offline", title: "L'app fonctionne-t-elle hors-ligne ?", subtitle: "Général", href: "/faq" },
  { type: "faq", id: "faq-badges", title: "Comment débloquer des badges ?", subtitle: "Gamification", href: "/faq" },
  { type: "faq", id: "faq-gamemax", title: "C'est quoi GameMax ?", subtitle: "Premium", href: "/faq" },
  { type: "faq", id: "faq-privacy", title: "Mes interactions sont-elles visibles ?", subtitle: "Confidentialité", href: "/faq" },
  { type: "faq", id: "faq-wing", title: "C'est quoi un Wing ?", subtitle: "Social", href: "/faq" },
  { type: "faq", id: "faq-sessions", title: "Comment fonctionnent les sessions ?", subtitle: "Fonctionnalités", href: "/faq" },
  { type: "faq", id: "faq-decay", title: "Mon XP peut-il baisser ?", subtitle: "Gamification", href: "/faq" },
  { type: "faq", id: "faq-parrainage", title: "Comment fonctionne le parrainage ?", subtitle: "Premium", href: "/faq" },
  { type: "faq", id: "faq-account", title: "Comment supprimer mon compte ?", subtitle: "Compte", href: "/faq" },
  { type: "faq", id: "faq-export", title: "Comment fonctionne l'export PDF ?", subtitle: "Fonctionnalités", href: "/faq" },
  { type: "faq", id: "faq-coaching", title: "C'est quoi le coaching IA ?", subtitle: "Fonctionnalités", href: "/faq" },
];

const TYPE_ICONS: Record<string, string> = {
  page: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z",
  interaction: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
  contact: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  wing: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M9 20H4v-2a3 3 0 0 1 5.356-1.857M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  session: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  faq: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z",
};

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  interaction: "Interaction",
  contact: "Contact",
  wing: "Wing",
  session: "Session",
  faq: "FAQ",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { interactions } = useInteractions();
  const { contacts } = useContacts();
  const { wings } = useWings();
  const { sessions } = useSessions();

  // Ctrl+K or custom event to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-global-search", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-global-search", openHandler);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-search-item]");
    items[selectedIdx]?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent/suggested pages when empty
      return PAGES.slice(0, 8);
    }
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    // Search pages
    PAGES.forEach((p) => {
      if (p.title.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q)) items.push(p);
    });

    // Search FAQ entries
    FAQ_ENTRIES.forEach((f) => {
      if (f.title.toLowerCase().includes(q) || (f.subtitle || "").toLowerCase().includes(q)) items.push(f);
    });

    // Search interactions (top 5)
    interactions
      .filter((i) =>
        (i.firstName || "").toLowerCase().includes(q) ||
        (i.memorableElement || "").toLowerCase().includes(q) ||
        (i.location || "").toLowerCase().includes(q) ||
        (i.note || "").toLowerCase().includes(q) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        new Date(i.date).toLocaleDateString("fr-FR").includes(q)
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
      .filter((c) =>
        (c.firstName || "").toLowerCase().includes(q) ||
        (c.methodValue || "").toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (c.notes || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((c) => {
        items.push({
          type: "contact",
          id: c.id,
          title: c.firstName,
          subtitle: `${STATUS_LABELS[c.status]}${c.methodValue ? ` · ${c.methodValue}` : ""}`,
          href: `/contacts/${c.id}`,
        });
      });

    // Search wings (top 3)
    wings
      .filter((w) => (w.name || "").toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((w) => {
        items.push({
          type: "wing",
          id: w.id,
          title: w.name,
          subtitle: w.notes || undefined,
          href: `/wings/${w.id}`,
        });
      });

    // Search sessions (top 3)
    sessions
      .filter((s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q) ||
        new Date(s.date).toLocaleDateString("fr-FR").includes(q)
      )
      .slice(0, 3)
      .forEach((s) => {
        items.push({
          type: "session",
          id: s.id,
          title: s.title || s.location || "Session",
          subtitle: [s.location, new Date(s.date).toLocaleDateString("fr-FR")].filter(Boolean).join(" · "),
          href: `/sessions/${s.id}`,
        });
      });

    return items.slice(0, 12);
  }, [query, interactions, contacts, wings, sessions]);

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

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] sm:pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[94vw] max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg className="w-4 h-4 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher partout..."
            className="flex-1 bg-transparent text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--outline)] hover:text-[var(--on-surface)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          )}
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] text-[var(--outline)] bg-[var(--surface-high)] border border-[var(--border)] rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg className="w-8 h-8 text-[var(--outline)] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <p className="text-xs text-[var(--outline)]">Aucun résultat pour &quot;{query}&quot;</p>
            </div>
          ) : (
            <>
              {/* Group header when query is empty */}
              {!query.trim() && (
                <p className="px-4 py-1.5 text-[10px] font-semibold text-[var(--outline)] uppercase tracking-wider">Pages</p>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  data-search-item
                  onClick={() => navigate(r.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIdx ? "bg-[var(--primary)]/10" : "hover:bg-[var(--surface-high)]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    r.type === "page" ? "bg-[var(--primary)]/10" :
                    r.type === "interaction" ? "bg-amber-400/10" :
                    r.type === "contact" ? "bg-emerald-400/10" :
                    r.type === "wing" ? "bg-cyan-400/10" :
                    r.type === "session" ? "bg-rose-400/10" :
                    "bg-[var(--tertiary)]/10"
                  }`}>
                    <svg className={`w-4 h-4 ${
                      r.type === "page" ? "text-[var(--primary)]" :
                      r.type === "interaction" ? "text-amber-400" :
                      r.type === "contact" ? "text-emerald-400" :
                      r.type === "wing" ? "text-cyan-400" :
                      r.type === "session" ? "text-rose-400" :
                      "text-[var(--tertiary)]"
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[r.type]} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--on-surface)] truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[10px] text-[var(--outline)] truncate">{r.subtitle}</p>}
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-full ${
                    r.type === "page" ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
                    r.type === "interaction" ? "bg-amber-400/10 text-amber-400" :
                    r.type === "contact" ? "bg-emerald-400/10 text-emerald-400" :
                    r.type === "wing" ? "bg-cyan-400/10 text-cyan-400" :
                    r.type === "session" ? "bg-rose-400/10 text-rose-400" :
                    "bg-[var(--tertiary)]/10 text-[var(--tertiary)]"
                  }`}>
                    {TYPE_LABELS[r.type]}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--outline)]">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-[var(--surface-high)] border border-[var(--border)] rounded text-[9px]">↑↓</kbd> naviguer</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-[var(--surface-high)] border border-[var(--border)] rounded text-[9px]">↵</kbd> ouvrir</span>
          <span className="ml-auto hidden sm:flex items-center gap-1"><kbd className="px-1 py-0.5 bg-[var(--surface-high)] border border-[var(--border)] rounded text-[9px]">⌘K</kbd> recherche</span>
        </div>
      </div>
    </div>
  );
}
