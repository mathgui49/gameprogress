"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const QUOTES = [
  { text: "Parfois on fait tout bien, mais le numéro était faux depuis le début...", emoji: "📱" },
  { text: "Tu as approché avec confiance, mais cette page t'a ghost.", emoji: "👻" },
  { text: "Même les meilleurs se prennent des vents. Cette page n'existe pas.", emoji: "💨" },
  { text: "Elle avait l'air intéressée... mais cette URL a disparu comme un match Tinder.", emoji: "🔥" },
  { text: "404 : le close rate de cette page est de 0%. Essaie une autre approche.", emoji: "📊" },
];

export default function NotFound() {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md animate-fade-in">
        {/* 404 number with glow */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-[family-name:var(--font-grotesk)] font-bold leading-none bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/20 bg-clip-text text-transparent select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[var(--neon-purple)] blur-[80px]" />
          </div>
        </div>

        {/* Quote */}
        <div className="mb-8">
          <span className="text-4xl mb-4 block">{quote.emoji}</span>
          <p className="text-base sm:text-lg text-[var(--on-surface-variant)] italic leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-sm font-semibold text-white hover:shadow-[0_0_24px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95"
          >
            Retour au Dashboard
          </Link>
          <Link
            href="/interactions/new"
            className="px-6 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--border-hover)] transition-all"
          >
            Nouvelle interaction
          </Link>
        </div>
      </div>
    </div>
  );
}
