"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { PLAN_NAME_PRO, PRICE_MONTHLY, PRICE_YEARLY, PRICE_MONTHLY_EQUIVALENT, YEARLY_DISCOUNT_PERCENT, PLAN_FEATURES } from "@/lib/premium";

/* ── Intersection Observer hook for scroll animations ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Animated counter ── */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counted.current) {
        counted.current = true;
        let start = 0;
        const duration = 2000;
        const step = (ts: number) => {
          if (!start) start = ts;
          const pct = Math.min((ts - start) / duration, 1);
          el.textContent = Math.floor(pct * end) + suffix;
          if (pct < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ── Section wrapper with scroll animation ── */
function Section({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Feature card ── */
const FEATURES = [
  {
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
    title: "Dashboard Intelligent",
    desc: "Vue d'ensemble instantanée : interactions du jour, XP, streak, close rate, missions actives. Tout en un coup d'oeil.",
    color: "from-[#c084fc] to-[#818cf8]",
  },
  {
    icon: "M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z",
    title: "Gamification Complète",
    desc: "XP, niveaux, streaks, badges progressifs, milestones et missions personnalisées. Chaque action te rapproche du level suivant.",
    color: "from-[#f472b6] to-[#c084fc]",
  },
  {
    icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
    title: "Progression & Analytics",
    desc: "Score de compétence, rang évolutif, rapports mensuels détaillés, graphiques d'évolution et export PDF.",
    color: "from-[#818cf8] to-[#67e8f9]",
  },
  {
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    title: "Wings & Communauté",
    desc: "Ajoute tes wings, partage tes sessions, compare-toi au classement, like et commente dans le feed communautaire.",
    color: "from-[#34d399] to-[#818cf8]",
  },
  {
    icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    title: "Pipeline CRM",
    desc: "Gère tes contacts en Kanban : du premier close au date, suis chaque étape avec rappels et timeline complète.",
    color: "from-[#f59e0b] to-[#f472b6]",
  },
  {
    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z",
    title: "Journal & Réflexion",
    desc: "Note tes réflexions, mindset et reviews. Partage avec tes wings ou garde-les privées. Gagne de l'XP en écrivant.",
    color: "from-[#67e8f9] to-[#c084fc]",
  },
];

const STEPS = [
  { num: "01", title: "Crée ton profil", desc: "Connecte-toi en 2 secondes avec Google et personnalise ton profil.", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { num: "02", title: "Track tes interactions", desc: "Log chaque approche en détail : type, résultat, ressenti, notes. Rapide ou complet.", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { num: "03", title: "Progresse et domine", desc: "Gagne de l'XP, débloque des badges, complète des missions et grimpe au classement.", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" },
];

const RANKS = [
  { name: "Débutant", color: "#8a839e" },
  { name: "Apprenti", color: "#67e8f9" },
  { name: "Intermédiaire", color: "#34d399" },
  { name: "Confirmé", color: "#818cf8" },
  { name: "Avancé", color: "#c084fc" },
  { name: "Expert", color: "#f472b6" },
  { name: "Maître", color: "#f59e0b" },
];

const SHOWCASE_TABS = [
  { key: "dashboard", label: "Dashboard", desc: "Tableau de bord complet avec XP, streak, stats du jour et activité récente. Tout est visible en un coup d'oeil pour rester motivé." },
  { key: "progression", label: "Progression", desc: "Score de compétence calculé automatiquement, rang évolutif, collection de badges et milestones à débloquer." },
  { key: "missions", label: "Missions", desc: "Crée des missions personnalisées avec suivi automatique ou manuel. Deadline, XP reward, progression en temps réel." },
  { key: "leaderboard", label: "Classement", desc: "Compare-toi aux autres gamers. Classement par XP, niveau ou streak. Filtre par ville pour un défi local." },
  { key: "pipeline", label: "Pipeline", desc: "CRM intégré pour gérer tes contacts : du premier close au date, suis chaque étape avec des rappels intelligents." },
];

const BADGE_ICONS = [
  "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
  "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872",
  "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  "M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58",
];

/* ── Check/Cross icons for comparison table ── */
function Check() {
  return (
    <svg className="w-5 h-5 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg className="w-5 h-5 text-[#fb7185]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <div className="min-h-screen bg-[#060510] text-[#f0eef5] overflow-x-hidden">
      {/* ─── Sticky Nav ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? "bg-[rgba(6,5,16,0.82)] backdrop-blur-[48px] border-b border-[rgba(192,132,252,0.08)]" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GameProgress" width={32} height={32} className="rounded-[10px] animate-logo-pulse" priority />
            <span className="font-[family-name:var(--font-grotesk)] font-bold text-lg">GameProgress</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Features</a>
            <a href="#showcase" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Aperçu</a>
            <a href="#pricing" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Tarifs</a>
            <a href="#guide" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Guide</a>
          </div>
          <a href="/" className="px-5 py-2 rounded-[14px] bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-sm font-semibold text-white hover:opacity-90 hover:shadow-[0_0_24px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95">
            Commencer
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#c084fc]/[0.05] blur-[140px] animate-pulse" style={{ animationDuration: "5s" }} />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#f472b6]/[0.04] blur-[120px] animate-pulse" style={{ animationDuration: "7s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#818cf8]/[0.02] blur-[160px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(192,132,252,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(192,132,252,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" style={{ transform: `translateY(${scrollY * 0.08}px)` }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <Section>
            <div className="mb-6">
              <Image src="/logo.png" alt="GameProgress" width={72} height={72} className="mx-auto rounded-[18px] shadow-[0_0_40px_-8px_rgba(192,132,252,0.4)] animate-logo-pulse" priority />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.1)] mb-8">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
              <span className="text-xs font-medium text-[#c084fc]">La plateforme #1 de progression sociale</span>
            </div>
          </Section>

          <Section delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-[family-name:var(--font-grotesk)] font-bold leading-[1.1] mb-6 text-white">
              Transforme chaque{" "}
              <span className="bg-gradient-to-r from-[#c084fc] via-[#f472b6] to-[#818cf8] bg-clip-text text-transparent animate-gradient-text">
                interaction
              </span>
              <br />en progression
            </h1>
          </Section>

          <Section delay={200}>
            <p className="text-lg sm:text-xl text-[#a09bb2] max-w-2xl mx-auto mb-10 leading-relaxed">
              L&apos;app gamifiée la plus complète pour tracker, analyser et booster tes compétences sociales.
              XP, missions, classements, IA coaching — ta progression n&apos;a jamais été aussi claire.
            </p>
          </Section>

          <Section delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a href="/" className="group px-8 py-3.5 rounded-[14px] bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-base font-semibold text-white hover:shadow-[0_0_32px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                Commencer maintenant
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </a>
              <a href="#pricing" className="px-8 py-3.5 rounded-[14px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.12)] text-base font-medium text-[#a09bb2] hover:text-[#f0eef5] hover:border-[rgba(192,132,252,0.25)] transition-all">
                Voir les tarifs
              </a>
            </div>
          </Section>

          {/* Download buttons */}
          <Section delay={350}>
            <div className="flex items-center justify-center gap-3 mb-12">
              <span
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-[12px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.12)] opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-[#34d399]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 2.236l-2.07 3.587a12.14 12.14 0 00-6.906 0L6.477 2.236a.5.5 0 00-.866.5l2.02 3.5A12.01 12.01 0 002 16h20a12.01 12.01 0 00-5.63-9.764l2.02-3.5a.5.5 0 00-.867-.5zM8.5 12.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm7 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-[#8a839e] leading-none">Télécharger sur</p>
                  <p className="text-sm font-semibold text-[#f0eef5] leading-tight">Android</p>
                </div>
              </span>
              <button
                type="button"
                onClick={() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    alert("Sur Safari :\n1. Appuie sur le bouton Partager (carré avec flèche)\n2. Choisis \"Sur l'écran d'accueil\"\n3. Confirme avec \"Ajouter\"");
                  } else {
                    alert("Sur iPhone :\n1. Ouvre ce site dans Safari\n2. Appuie sur le bouton Partager\n3. Choisis \"Sur l'écran d'accueil\"");
                  }
                }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-[12px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.12)] hover:border-[rgba(192,132,252,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5 text-[#a09bb2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-[#8a839e] leading-none">Installer sur</p>
                  <p className="text-sm font-semibold text-[#f0eef5] leading-tight">iPhone</p>
                </div>
              </button>
            </div>
          </Section>

          {/* Trust badges */}
          <Section delay={400}>
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {[
                { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", label: "Données privées" },
                { icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3", label: "PWA Mobile" },
                { icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", label: "IA Coaching" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[#8a839e]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                  <span className="text-xs font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Hero mockup */}
          <Section delay={500}>
            <div className="mt-16 relative">
              <div className="absolute -inset-4 bg-gradient-to-b from-[#c084fc]/8 to-transparent rounded-[22px] blur-2xl" />
              <div className="relative rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.08)] p-6 shadow-[0_0_64px_-16px_rgba(192,132,252,0.15)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#fb7185]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#34d399]/80" />
                  <span className="ml-3 text-[10px] text-[#8a839e]">gameprogress.app</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "AUJOURD'HUI", value: "5", sub: "interactions", color: "#c084fc" },
                    { label: "CETTE SEMAINE", value: "23", sub: "interactions", color: "#818cf8" },
                    { label: "CLOSES", value: "8", sub: "34% taux", color: "#34d399" },
                    { label: "RESSENTI", value: "7.4", sub: "moyenne /10", color: "#f59e0b" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-[16px] border border-[rgba(192,132,252,0.06)] p-3">
                      <p className="text-[8px] uppercase tracking-wider text-[#8a839e] mb-2">{s.label}</p>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px] text-[#8a839e] mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-[16px] border border-[rgba(192,132,252,0.06)]">
                  <div className="w-10 h-10 rounded-full border-2 border-[#c084fc]/60 flex items-center justify-center shadow-[0_0_10px_-2px_rgba(192,132,252,0.3)]">
                    <span className="text-sm font-bold text-[#c084fc]">7</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-[#a09bb2]">Niveau 7</span>
                      <span className="text-[10px] text-[#c084fc]">1,250/2,000 XP</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#28203a]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] w-[62%] shadow-[0_0_8px_rgba(192,132,252,0.3)]" />
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    </svg>
                    12j
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#c084fc] mb-3 block">Features</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4 text-white">
                Tout ce dont tu as besoin pour{" "}
                <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent animate-gradient-text">progresser</span>
              </h2>
              <p className="text-[#a09bb2] max-w-xl mx-auto">La solution la plus complète du marché. 6 modules puissants qui travaillent ensemble pour tracker, analyser et booster ta progression sociale.</p>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Section key={f.title} delay={i * 80}>
                <div className="group relative rounded-[18px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] p-6 hover:border-[rgba(192,132,252,0.16)] transition-all duration-300 hover:shadow-[0_8px_48px_-12px_rgba(192,132,252,0.12)] h-full">
                  <div className="absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                  <div className={`relative w-12 h-12 rounded-[12px] bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="relative text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[#f0eef5] mb-2">{f.title}</h3>
                  <p className="relative text-sm text-[#a09bb2] leading-relaxed">{f.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ─── APP SHOWCASE ─── */}
      <section id="showcase" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c084fc]/[0.015] to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <Section>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#818cf8] mb-3 block">Aperçu</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4 text-white">
                Découvre l&apos;expérience{" "}
                <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent animate-gradient-text">GameProgress</span>
              </h2>
            </div>
          </Section>

          <Section delay={100}>
            <div className="flex justify-center mb-10 overflow-x-auto no-scrollbar px-2">
              <div className="inline-flex gap-1 p-1 rounded-[14px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] min-w-0 shrink-0" role="tablist" aria-label="Aperçu des fonctionnalités">
                {SHOWCASE_TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={activeTab === t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === t.key ? "bg-[rgba(192,132,252,0.12)] text-[#c084fc] shadow-[0_0_8px_-2px_rgba(192,132,252,0.3)]" : "text-[#8a839e] hover:text-[#a09bb2]"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1">
                {SHOWCASE_TABS.filter((t) => t.key === activeTab).map((t) => (
                  <div key={t.key} className="animate-fade-in">
                    <h3 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] mb-4">{t.label}</h3>
                    <p className="text-[#a09bb2] leading-relaxed mb-6">{t.desc}</p>
                    <div className="flex flex-wrap gap-3">
                      {["Temps réel", "Gamifié", "Mobile-first"].map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-[rgba(192,132,252,0.08)] backdrop-blur-sm border border-[rgba(192,132,252,0.1)] text-[#c084fc] text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="order-1 lg:order-2">
                <div className="rounded-[18px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.08)] p-5 shadow-[0_0_48px_-12px_rgba(192,132,252,0.1)]">
                  {activeTab === "dashboard" && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Stats hero row */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { l: "Interactions", v: "5", sub: "aujourd'hui", c: "#c084fc" },
                          { l: "Close rate", v: "41%", sub: "+6% vs sem.", c: "#34d399" },
                          { l: "Streak", v: "12j", sub: "record", c: "#f59e0b" },
                          { l: "Niveau", v: "7", sub: "1,250 XP", c: "#818cf8" },
                        ].map((s) => (
                          <div key={s.l} className="rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-sm p-2.5 border border-[rgba(192,132,252,0.08)]">
                            <p className="text-[7px] uppercase tracking-wider text-[#8a839e] mb-1">{s.l}</p>
                            <p className="text-base font-bold font-[family-name:var(--font-grotesk)]" style={{ color: s.c }}>{s.v}</p>
                            <p className="text-[7px] text-[#8a839e] mt-0.5">{s.sub}</p>
                          </div>
                        ))}
                      </div>
                      {/* XP bar */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-sm border border-[rgba(192,132,252,0.08)]">
                        <div className="w-8 h-8 rounded-full border-2 border-[#c084fc]/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#c084fc]">7</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-[9px] text-[#a09bb2]">Niveau 7</span>
                            <span className="text-[9px] text-[#c084fc]">62%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#28203a]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] w-[62%]" />
                          </div>
                        </div>
                      </div>
                      {/* Activity */}
                      <div className="rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-sm p-3 border border-[rgba(192,132,252,0.08)]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-[#c084fc]/15 flex items-center justify-center">
                            <svg className="w-3 h-3 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                          </div>
                          <p className="text-[9px] uppercase tracking-wider text-[#8a839e]">Activité récente</p>
                        </div>
                        {[
                          { name: "Emma", type: "Direct", result: "Close", color: "#34d399" },
                          { name: "Sarah", type: "Indirect", result: "Neutre", color: "#f59e0b" },
                          { name: "Julie", type: "Situationnel", result: "Close", color: "#34d399" },
                        ].map((a, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-[rgba(192,132,252,0.04)] last:border-0">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center text-[8px] font-bold text-[#c084fc]">{a.name[0]}</div>
                            <span className="text-[10px] text-[#a09bb2] flex-1">{a.name} · {a.type}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${a.color}15`, color: a.color }}>{a.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === "progression" && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center gap-4 p-3 rounded-[14px] bg-[rgba(14,11,24,0.5)] border border-[rgba(192,132,252,0.08)]">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center relative shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#28203a" strokeWidth="5" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#landing-skill)" strokeWidth="5" strokeLinecap="round" strokeDasharray="184.73 263.89" />
                            <defs><linearGradient id="landing-skill"><stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#f472b6" /></linearGradient></defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold text-[#c084fc] font-[family-name:var(--font-grotesk)]">70</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-bold text-[#c084fc]">Avancé</p>
                          <p className="text-[9px] text-[#8a839e]">Score global /100</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { l: "Close", v: "45%", c: "#34d399" },
                              { l: "Ressenti", v: "25%", c: "#f59e0b" },
                              { l: "Volume", v: "18%", c: "#818cf8" },
                              { l: "Streak", v: "12%", c: "#f472b6" },
                            ].map((s) => (
                              <span key={s.l} className="text-[8px] px-1.5 py-0.5 rounded-full border border-[rgba(192,132,252,0.08)]" style={{ color: s.c }}>{s.l} {s.v}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Badges grid */}
                      <div className="rounded-[14px] bg-[rgba(14,11,24,0.5)] border border-[rgba(192,132,252,0.08)] p-3">
                        <p className="text-[9px] uppercase tracking-wider text-[#8a839e] mb-2">Badges débloqués</p>
                        <div className="grid grid-cols-6 gap-2">
                          {["🎯", "🔥", "💬", "⭐", "🏆", "🛡️"].map((e, i) => (
                            <div key={i} className="w-full aspect-square rounded-[10px] bg-gradient-to-br from-[#c084fc]/10 to-[#f472b6]/10 border border-[rgba(192,132,252,0.12)] flex items-center justify-center text-base">{e}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "missions" && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        {[{ l: "En cours", v: "3", c: "#818cf8" }, { l: "Complétées", v: "12", c: "#34d399" }, { l: "XP gagné", v: "450", c: "#c084fc" }].map((s) => (
                          <div key={s.l} className="rounded-[12px] bg-[rgba(14,11,24,0.5)] border border-[rgba(192,132,252,0.08)] p-2 text-center">
                            <p className="text-sm font-bold font-[family-name:var(--font-grotesk)]" style={{ color: s.c }}>{s.v}</p>
                            <p className="text-[7px] text-[#8a839e] uppercase">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      {[
                        { title: "5 closes cette semaine", pct: 60, xp: 50, icon: "🎯" },
                        { title: "10 interactions / jour", pct: 80, xp: 100, icon: "💬" },
                        { title: "Journal quotidien", pct: 85, xp: 30, icon: "📝" },
                      ].map((m) => (
                        <div key={m.title} className="rounded-[14px] bg-[rgba(14,11,24,0.5)] backdrop-blur-sm p-3 border border-[rgba(192,132,252,0.08)]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{m.icon}</span>
                            <span className="text-xs text-[#f0eef5] flex-1">{m.title}</span>
                            <span className="text-[9px] text-[#c084fc] font-semibold bg-[#c084fc]/10 px-1.5 py-0.5 rounded-md">+{m.xp} XP</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-[#28203a]">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6]" style={{ width: `${m.pct}%` }} />
                            </div>
                            <span className="text-[9px] text-[#a09bb2] font-medium">{m.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "leaderboard" && (
                    <div className="space-y-2 animate-fade-in">
                      {/* Top 3 podium */}
                      <div className="flex items-end justify-center gap-3 mb-2 pb-2">
                        {[
                          { rank: 2, name: "Maxime", xp: "3,810", h: "h-12", color: "#a09bb2" },
                          { rank: 1, name: "Alex", xp: "4,520", h: "h-16", color: "#f59e0b" },
                          { rank: 3, name: "Julien", xp: "2,950", h: "h-10", color: "#cd7f32" },
                        ].map((p) => (
                          <div key={p.rank} className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-bold" style={{ borderColor: p.color, color: p.color }}>{p.name[0]}</div>
                            <span className="text-[9px] text-[#f0eef5]">{p.name}</span>
                            <div className={`w-14 ${p.h} rounded-t-lg flex items-center justify-center`} style={{ backgroundColor: `${p.color}20` }}>
                              <span className="text-xs font-bold" style={{ color: p.color }}>#{p.rank}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Current user */}
                      <div className="flex items-center gap-3 p-2.5 rounded-[14px] bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.15)]">
                        <span className="w-6 text-center text-sm font-bold text-[#c084fc]">4</span>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c084fc]/30 to-[#818cf8]/30 flex items-center justify-center text-[10px] font-bold text-[#c084fc]">T</div>
                        <span className="flex-1 text-sm text-[#f0eef5] font-medium">Toi</span>
                        <span className="text-xs text-[#c084fc] font-semibold">2,100 XP</span>
                      </div>
                    </div>
                  )}
                  {activeTab === "pipeline" && (
                    <div className="space-y-2 animate-fade-in">
                      {/* Mini kanban */}
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        {[
                          { stage: "Nouveau", count: 3, color: "#c084fc" },
                          { stage: "Contacté", count: 5, color: "#f59e0b" },
                          { stage: "Répondu", count: 2, color: "#34d399" },
                        ].map((s) => (
                          <div key={s.stage} className="rounded-[10px] bg-[rgba(14,11,24,0.5)] border border-[rgba(192,132,252,0.08)] p-2 text-center">
                            <p className="text-base font-bold font-[family-name:var(--font-grotesk)]" style={{ color: s.color }}>{s.count}</p>
                            <p className="text-[7px] text-[#8a839e] uppercase">{s.stage}</p>
                          </div>
                        ))}
                      </div>
                      {[
                        { name: "Emma", status: "Date planifié", color: "#818cf8", method: "IG" },
                        { name: "Sarah", status: "Répondu", color: "#34d399", method: "Tel" },
                        { name: "Julie", status: "Contacté", color: "#f59e0b", method: "IG" },
                        { name: "Léa", status: "Nouveau", color: "#c084fc", method: "Direct" },
                      ].map((c) => (
                        <div key={c.name} className="flex items-center gap-2.5 p-2.5 rounded-[14px] bg-[rgba(14,11,24,0.5)] border border-[rgba(192,132,252,0.08)]">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#f472b6]/20 flex items-center justify-center text-[9px] font-bold text-[#c084fc]">{c.name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-[#f0eef5] block">{c.name}</span>
                            <span className="text-[8px] text-[#8a839e]">via {c.method}</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: `${c.color}15`, color: c.color }}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── GAMIFICATION DEEP DIVE ─── */}
      <section id="gamification" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#f472b6] mb-3 block">Gamification</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4 text-white">
                Chaque action te fait{" "}
                <span className="bg-gradient-to-r from-[#f472b6] to-[#f59e0b] bg-clip-text text-transparent animate-gradient-text">progresser</span>
              </h2>
            </div>
          </Section>

          <Section delay={100}>
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {["Interagis", "Gagne de l'XP", "Monte de niveau", "Débloque des badges", "Complète des missions", "Grimpe au classement"].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-full bg-[rgba(14,11,24,0.65)] backdrop-blur-[16px] border border-[rgba(192,132,252,0.08)] text-sm text-[#f0eef5] font-medium">{step}</span>
                  {i < 5 && <svg className="w-4 h-4 text-[#8a839e] hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>}
                </div>
              ))}
            </div>
          </Section>

          <Section delay={200}>
            <div className="rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] p-8 mb-8">
              <h3 className="text-center text-sm font-semibold text-[#a09bb2] uppercase tracking-wider mb-8">Système de rang</h3>
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {RANKS.map((r, i) => (
                  <div key={r.name} className="flex flex-col items-center gap-2 min-w-[80px]">
                    <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: r.color, color: r.color, boxShadow: `0 0 10px -2px ${r.color}40` }}>
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-medium text-center" style={{ color: r.color }}>{r.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1 rounded-full bg-[#28203a] mx-8 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#8a839e] via-[#c084fc] to-[#f59e0b]" style={{ width: "65%" }} />
              </div>
            </div>
          </Section>

          <Section delay={300}>
            <div className="rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] p-8">
              <h3 className="text-center text-sm font-semibold text-[#a09bb2] uppercase tracking-wider mb-6">Badges progressifs à débloquer</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 justify-items-center">
                {Array.from({ length: 16 }).map((_, i) => {
                  const unlocked = i < 8;
                  const iconPath = BADGE_ICONS[i % BADGE_ICONS.length];
                  return (
                    <div
                      key={i}
                      className={`w-11 h-11 rounded-[12px] flex items-center justify-center transition-all ${unlocked ? "bg-gradient-to-br from-[rgba(192,132,252,0.15)] to-[rgba(244,114,182,0.1)] border border-[rgba(192,132,252,0.15)] shadow-[0_0_12px_-4px_rgba(192,132,252,0.25)]" : "bg-[rgba(14,11,24,0.4)] border border-[rgba(192,132,252,0.04)] opacity-30"}`}
                    >
                      <svg className={`w-5 h-5 ${unlocked ? "text-[#c084fc]" : "text-[#3d3650]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={unlocked ? iconPath : "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"} />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c084fc]/[0.02] to-transparent" />
        <div className="max-w-5xl mx-auto relative">
          <Section>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#f59e0b] mb-3 block">Tarifs</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4 text-white">
                Choisis ton{" "}
                <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent animate-gradient-text">plan</span>
              </h2>
              <p className="text-[#a09bb2] max-w-lg mx-auto">
                Commence avec le plan gratuit et passe à {PLAN_NAME_PRO} quand tu es prêt à débloquer tout le potentiel.
              </p>
            </div>
          </Section>

          {/* Billing toggle */}
          <Section delay={50}>
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center gap-1 p-1 rounded-[12px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)]">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-[rgba(192,132,252,0.12)] text-[#c084fc]" : "text-[#8a839e]"}`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-all relative ${billingCycle === "yearly" ? "bg-[rgba(192,132,252,0.12)] text-[#c084fc]" : "text-[#8a839e]"}`}
                >
                  Annuel
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-[#34d399] text-[8px] font-bold text-[#060510]">-{YEARLY_DISCOUNT_PERCENT}%</span>
                </button>
              </div>
            </div>
          </Section>

          {/* Pricing cards */}
          <Section delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] p-8">
                <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[#a09bb2] mb-1">Gratuit</h3>
                <p className="text-sm text-[#8a839e] mb-6">Pour découvrir et commencer</p>
                <div className="mb-6">
                  <span className="text-4xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5]">0&euro;</span>
                  <span className="text-sm text-[#8a839e]">/mois</span>
                </div>
                <a href="/" className="block w-full text-center px-6 py-3 rounded-[12px] bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.12)] text-[#c084fc] text-sm font-semibold hover:bg-[rgba(192,132,252,0.15)] transition-all mb-6">
                  Commencer
                </a>
                <ul className="space-y-3">
                  {[
                    "15 interactions/mois",
                    "5 contacts actifs",
                    "3 rédactions journal/mois",
                    "2 sessions/mois",
                    "3 wings maximum",
                    "XP, niveaux et streaks",
                    "Missions daily",
                    "Feed et messages illimités",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#a09bb2]">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* GameMax Plan */}
              <div className="relative rounded-[22px] bg-gradient-to-b from-[rgba(192,132,252,0.08)] to-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border-2 border-[rgba(192,132,252,0.25)] p-8 shadow-[0_0_48px_-12px_rgba(192,132,252,0.15)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-xs font-bold text-white">
                  Recommandé
                </div>
                <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] mb-1">{PLAN_NAME_PRO}</h3>
                <p className="text-sm text-[#a09bb2] mb-6">Tout débloquer, sans limites</p>
                <div className="mb-2">
                  {billingCycle === "yearly" ? (
                    <>
                      <span className="text-4xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5]">{PRICE_MONTHLY_EQUIVALENT}&euro;</span>
                      <span className="text-sm text-[#8a839e]">/mois</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5]">{PRICE_MONTHLY}&euro;</span>
                      <span className="text-sm text-[#8a839e]">/mois</span>
                    </>
                  )}
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-xs text-[#c084fc] mb-4">Facturé {PRICE_YEARLY}&euro;/an au lieu de {(PRICE_MONTHLY * 12).toFixed(2)}&euro;</p>
                )}
                {billingCycle === "monthly" && (
                  <p className="text-xs text-[#8a839e] mb-4">Moins cher qu&apos;un kebab</p>
                )}
                <a href="/" className="block w-full text-center px-6 py-3 rounded-[12px] bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-white text-sm font-semibold hover:shadow-[0_0_24px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] mb-6">
                  Passer à {PLAN_NAME_PRO}
                </a>
                <ul className="space-y-3">
                  {[
                    "Interactions illimitées",
                    "Contacts & pipeline illimités",
                    "Journal illimité + collections",
                    "Sessions illimitées + carte",
                    "Wings illimités + challenges",
                    "Coaching IA personnalisé",
                    "Analytics avancés + heatmap",
                    "Export PDF des rapports",
                    "Tous les badges + rang complet",
                    "Missions weekly & custom",
                    "Classement complet + comparaison",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#f0eef5]">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-[#8a839e] text-center mt-6">Satisfait ou remboursé 14 jours</p>
              </div>
            </div>
          </Section>

          {/* ─── Comparison Table ─── */}
          <Section delay={200}>
            <div className="mt-16">
              <h3 className="text-center text-lg font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] mb-8">Comparatif détaillé</h3>
              <div className="rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.06)] overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] border-b border-[rgba(192,132,252,0.06)] bg-[rgba(192,132,252,0.04)]">
                  <div className="px-5 py-3 text-xs font-semibold text-[#8a839e] uppercase tracking-wider">Fonctionnalité</div>
                  <div className="px-3 py-3 text-xs font-semibold text-[#8a839e] uppercase tracking-wider text-center">Gratuit</div>
                  <div className="px-3 py-3 text-xs font-semibold text-[#c084fc] uppercase tracking-wider text-center">{PLAN_NAME_PRO}</div>
                </div>
                {PLAN_FEATURES.map((f, i) => (
                  <div key={f.name} className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] ${i < PLAN_FEATURES.length - 1 ? "border-b border-[rgba(192,132,252,0.04)]" : ""}`}>
                    <div className="px-5 py-3 text-sm text-[#a09bb2]">{f.name}</div>
                    <div className="px-3 py-3 flex items-center justify-center">
                      {typeof f.free === "boolean" ? (
                        f.free ? <Check /> : <Cross />
                      ) : (
                        <span className="text-xs text-[#8a839e] text-center">{f.free}</span>
                      )}
                    </div>
                    <div className="px-3 py-3 flex items-center justify-center">
                      {typeof f.pro === "boolean" ? (
                        f.pro ? <Check /> : <Cross />
                      ) : (
                        <span className="text-xs text-[#c084fc] font-medium text-center">{f.pro}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── STATS / SOCIAL PROOF ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: 500, suffix: "+", label: "Interactions trackées" },
                { value: 50, suffix: "+", label: "Utilisateurs actifs" },
                { value: 10, suffix: "K+", label: "XP gagnés" },
                { value: 200, suffix: "+", label: "Missions complétées" },
              ].map((s) => (
                <div key={s.label} className="text-center p-6 rounded-[18px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.08)] hover:border-[rgba(192,132,252,0.16)] transition-all hover:shadow-[0_8px_48px_-12px_rgba(192,132,252,0.1)]">
                  <p className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold text-[#c084fc] neon-text-purple">
                    <Counter end={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs text-[#8a839e] mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#818cf8]/[0.015] to-transparent" />
        <div className="max-w-4xl mx-auto relative">
          <Section>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#34d399] mb-3 block">Comment ça marche</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold text-white">
                3 étapes pour commencer
              </h2>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Section key={s.num} delay={i * 120}>
                <div className="text-center relative">
                  {i < 2 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t border-dashed border-[rgba(192,132,252,0.1)]" />}
                  <div className="w-20 h-20 rounded-[18px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.08)] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#c084fc]/50">{s.num}</span>
                  <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[#f0eef5] mb-2 mt-1">{s.title}</h3>
                  <p className="text-sm text-[#a09bb2]">{s.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL ─── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Section>
            <div className="text-center relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-[#c084fc]/[0.04] to-[#f472b6]/[0.04] rounded-[22px] blur-xl" />
              <div className="relative rounded-[22px] bg-[rgba(14,11,24,0.65)] backdrop-blur-[32px] border border-[rgba(192,132,252,0.08)] p-10">
                <svg className="w-10 h-10 text-[#c084fc]/20 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
                </svg>
                <blockquote className="text-lg sm:text-xl text-[#f0eef5] leading-relaxed mb-6 font-medium">
                  &ldquo;GameProgress a changé ma façon de voir la progression. Chaque jour je vois mes stats monter, ça motive à fond. Le système de missions et de badges rend le process addictif.&rdquo;
                </blockquote>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center text-sm font-bold text-[#c084fc]">A</div>
                  <div>
                    <p className="text-sm font-semibold text-[#f0eef5]">Alex M.</p>
                    <p className="text-xs text-[#8a839e]">Utilisateur {PLAN_NAME_PRO} depuis 3 mois</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── REFERRAL CTA ─── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Section>
            <div className="rounded-[22px] bg-gradient-to-r from-[rgba(52,211,153,0.06)] to-[rgba(129,140,248,0.06)] backdrop-blur-[32px] border border-[rgba(52,211,153,0.12)] p-8 text-center">
              <h3 className="text-xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] mb-3">Parraine un pote, gagnez tous les deux</h3>
              <p className="text-sm text-[#a09bb2] mb-6 max-w-md mx-auto">
                Invite un ami avec ton lien de parrainage. Il obtient <strong className="text-[#34d399]">7 jours de {PLAN_NAME_PRO}</strong> et toi aussi.
                S&apos;il souscrit, tu gagnes <strong className="text-[#34d399]">1 mois offert</strong>.
              </p>
              <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] bg-gradient-to-r from-[#34d399] to-[#818cf8] text-white text-sm font-semibold hover:shadow-[0_0_24px_-4px_rgba(52,211,153,0.4)] transition-all hover:scale-105 active:scale-95">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Obtenir mon lien de parrainage
              </a>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#c084fc]/[0.04] to-transparent" />
        <div className="max-w-3xl mx-auto relative text-center">
          <Section>
            <h2 className="text-3xl sm:text-5xl font-[family-name:var(--font-grotesk)] font-bold mb-6 text-white">
              Prêt à transformer{" "}
              <span className="bg-gradient-to-r from-[#c084fc] via-[#f472b6] to-[#818cf8] bg-clip-text text-transparent animate-gradient-text">ton game</span> ?
            </h2>
            <p className="text-lg text-[#a09bb2] mb-4">
              Rejoins GameProgress et commence à tracker ta progression dès aujourd&apos;hui.
            </p>
            <p className="text-sm text-[#8a839e] mb-10">
              Plan gratuit pour démarrer, puis {PLAN_NAME_PRO} à {PRICE_MONTHLY}&euro;/mois pour tout débloquer. Moins cher qu&apos;un kebab.
            </p>
            <a href="/" className="group inline-flex items-center gap-2 px-10 py-4 rounded-[14px] bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-lg font-semibold text-white hover:shadow-[0_0_48px_-8px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95 animate-neon-pulse">
              S&apos;inscrire maintenant
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </a>
          </Section>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[rgba(192,132,252,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="GameProgress" width={32} height={32} className="rounded-[10px] animate-logo-pulse" />
              <span className="font-[family-name:var(--font-grotesk)] font-bold">GameProgress</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Fonctionnalités</a>
              <a href="#pricing" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Tarifs</a>
              <Link href="/guide" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Guide</Link>
              <a href="#how" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Comment ça marche</a>
            </div>
            <div className="flex items-center gap-6">
              <a href="/cgu" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">CGU</a>
              <a href="/rgpd" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Confidentialité</a>
              <a href="/mentions-legales" className="text-xs text-[#8a839e] hover:text-[#a09bb2] transition-colors">Mentions légales</a>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#3d3650]">&copy; 2025 GameProgress</p>
              <p className="text-[10px] text-[#3d3650] mt-1">Développé par Mathieu Guicheteau, propulsé par MathBusiness</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
