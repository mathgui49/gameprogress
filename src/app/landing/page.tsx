"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

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
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
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
    desc: "Vue d'ensemble instantanee : interactions du jour, XP, streak, close rate, missions actives. Tout en un coup d'oeil.",
    color: "from-[#c084fc] to-[#818cf8]",
  },
  {
    icon: "M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z",
    title: "Gamification Complete",
    desc: "XP, niveaux, streaks, 18+ badges, milestones et missions personnalisées. Chaque action te rapproche du level suivant.",
    color: "from-[#f472b6] to-[#c084fc]",
  },
  {
    icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
    title: "Progression & Analytics",
    desc: "Score de compétence, rang (Débutant à Maître), rapports mensuels détaillés, graphiques d'évolution et export PDF.",
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
  { name: "Débutant", color: "#6b6580" },
  { name: "Apprenti", color: "#67e8f9" },
  { name: "Intermédiaire", color: "#34d399" },
  { name: "Confirmé", color: "#818cf8" },
  { name: "Avancé", color: "#c084fc" },
  { name: "Expert", color: "#f472b6" },
  { name: "Maître", color: "#f59e0b" },
];

const SHOWCASE_TABS = [
  { key: "dashboard", label: "Dashboard", desc: "Tableau de bord complet avec XP, streak, stats du jour et activité récente. Tout est visible en un coup d'œil pour rester motivé." },
  { key: "progression", label: "Progression", desc: "Score de compétence calculé automatiquement, rang évolutif, collection de badges et milestones à débloquer." },
  { key: "missions", label: "Missions", desc: "Crée des missions personnalisées avec suivi automatique ou manuel. Deadline, XP reward, progression en temps réel." },
  { key: "leaderboard", label: "Classement", desc: "Compare-toi aux autres joueurs. Classement par XP, niveau ou streak. Filtre par ville pour un défi local." },
  { key: "pipeline", label: "Pipeline", desc: "CRM intégré pour gérer tes contacts : du numéro au date, suis chaque étape avec des rappels intelligents." },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0a12] text-[#f0eef5] overflow-x-hidden">
      {/* ─── Sticky Nav ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? "bg-[#0d0a12]/80 backdrop-blur-xl border-b border-[rgba(192,132,252,0.06)]" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="GameProgress" width={32} height={32} className="rounded-lg shadow-[0_0_16px_-4px_rgba(192,132,252,0.4)]" />
            <span className="font-[family-name:var(--font-grotesk)] font-bold text-lg">GameProgress</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Features</a>
            <a href="#showcase" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Apercu</a>
            <a href="#gamification" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Gamification</a>
            <a href="#how" className="text-sm text-[#a09bb2] hover:text-[#c084fc] transition-colors">Comment ca marche</a>
          </div>
          <Link href="/login" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-sm font-semibold text-white hover:opacity-90 hover:shadow-[0_0_24px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95">
            Commencer
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#c084fc]/[0.07] blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#f472b6]/[0.05] blur-[100px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#818cf8]/[0.03] blur-[150px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(192,132,252,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(192,132,252,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" style={{ transform: `translateY(${scrollY * 0.1}px)` }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Section>
            <div className="mb-6">
              <Image src="/logo.webp" alt="GameProgress" width={72} height={72} className="mx-auto rounded-2xl shadow-[0_0_32px_-8px_rgba(192,132,252,0.5)]" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c084fc]/10 border border-[#c084fc]/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
              <span className="text-xs font-medium text-[#c084fc]">100% gratuit &middot; Open source</span>
            </div>
          </Section>

          <Section delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-[family-name:var(--font-grotesk)] font-bold leading-[1.1] mb-6">
              Transforme chaque{" "}
              <span className="bg-gradient-to-r from-[#c084fc] via-[#f472b6] to-[#818cf8] bg-clip-text text-transparent">
                interaction
              </span>
              <br />en progression
            </h1>
          </Section>

          <Section delay={200}>
            <p className="text-lg sm:text-xl text-[#a09bb2] max-w-2xl mx-auto mb-10 leading-relaxed">
              L&apos;app gamifiee qui track, analyse et booste tes competences sociales.
              XP, missions, classements — ta progression n&apos;a jamais ete aussi claire.
            </p>
          </Section>

          <Section delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/login" className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-base font-semibold text-white hover:shadow-[0_0_32px_-4px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                Commencer gratuitement
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
              <a href="#showcase" className="px-8 py-3.5 rounded-xl border border-[rgba(192,132,252,0.2)] text-base font-medium text-[#a09bb2] hover:text-[#f0eef5] hover:border-[rgba(192,132,252,0.4)] transition-all hover:bg-[rgba(192,132,252,0.05)]">
                Voir l&apos;aperçu
              </a>
            </div>
          </Section>

          {/* Trust badges */}
          <Section delay={400}>
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {[
                { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", label: "Données privées" },
                { icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3", label: "PWA Mobile" },
                { icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", label: "100% gratuit" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[#6b6580]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
                  <span className="text-xs font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Hero mockup */}
          <Section delay={500}>
            <div className="mt-16 relative">
              <div className="absolute -inset-4 bg-gradient-to-b from-[#c084fc]/10 to-transparent rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-[rgba(192,132,252,0.1)] bg-[#14111c] p-6 shadow-2xl shadow-[rgba(192,132,252,0.08)]">
                {/* Fake dashboard */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#fb7185]" />
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <div className="w-3 h-3 rounded-full bg-[#34d399]" />
                  <span className="ml-3 text-[10px] text-[#6b6580]">gameprogress.app</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "AUJOURD'HUI", value: "5", sub: "interactions", color: "#c084fc" },
                    { label: "CETTE SEMAINE", value: "23", sub: "interactions", color: "#818cf8" },
                    { label: "CLOSES", value: "8", sub: "34% taux", color: "#34d399" },
                    { label: "RESSENTI", value: "7.4", sub: "moyenne /10", color: "#f59e0b" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-[#1a1626] border border-[rgba(192,132,252,0.06)] p-3">
                      <p className="text-[8px] uppercase tracking-wider text-[#6b6580] mb-2">{s.label}</p>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px] text-[#6b6580] mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
                {/* XP bar */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1626] border border-[rgba(192,132,252,0.06)]">
                  <div className="w-10 h-10 rounded-full border-2 border-[#c084fc] flex items-center justify-center">
                    <span className="text-sm font-bold text-[#c084fc]">7</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-[#a09bb2]">Niveau 7</span>
                      <span className="text-[10px] text-[#c084fc]">1,250/2,000 XP</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#2a2438]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6] w-[62%] shadow-[0_0_8px_rgba(192,132,252,0.4)]" />
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 flex items-center gap-1">🔥 12j</span>
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
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4">
                Tout ce dont tu as besoin pour{" "}
                <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">progresser</span>
              </h2>
              <p className="text-[#a09bb2] max-w-xl mx-auto">6 modules puissants qui travaillent ensemble pour tracker, analyser et booster ta progression sociale.</p>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Section key={f.title} delay={i * 80}>
                <div className="group relative rounded-2xl border border-[rgba(192,132,252,0.06)] bg-[#14111c] p-6 hover:border-[rgba(192,132,252,0.15)] transition-all duration-300 hover:bg-[#1a1626] hover:shadow-[0_0_40px_-12px_rgba(192,132,252,0.15)] h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[#f0eef5] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#a09bb2] leading-relaxed">{f.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ─── APP SHOWCASE ─── */}
      <section id="showcase" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c084fc]/[0.02] to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <Section>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#818cf8] mb-3 block">Apercu</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4">
                Decouvre l&apos;experience{" "}
                <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent">GameProgress</span>
              </h2>
            </div>
          </Section>

          <Section delay={100}>
            {/* Tabs */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex gap-1 p-1 rounded-xl bg-[#14111c] border border-[rgba(192,132,252,0.06)]">
                {SHOWCASE_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? "bg-[#c084fc]/15 text-[#c084fc]" : "text-[#6b6580] hover:text-[#a09bb2]"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Showcase content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1">
                {SHOWCASE_TABS.filter((t) => t.key === activeTab).map((t) => (
                  <div key={t.key} className="animate-fade-in">
                    <h3 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[#f0eef5] mb-4">{t.label}</h3>
                    <p className="text-[#a09bb2] leading-relaxed mb-6">{t.desc}</p>
                    <div className="flex flex-wrap gap-3">
                      {["Temps reel", "Gamifie", "Mobile-first"].map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-[#c084fc]/10 text-[#c084fc] text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="order-1 lg:order-2">
                <div className="rounded-2xl border border-[rgba(192,132,252,0.1)] bg-[#14111c] p-5 shadow-2xl shadow-[rgba(192,132,252,0.05)]">
                  {activeTab === "dashboard" && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        {[{ l: "Interactions", v: "127", c: "#c084fc" }, { l: "Close rate", v: "34%", c: "#34d399" }].map((s) => (
                          <div key={s.l} className="rounded-lg bg-[#1a1626] p-3 border border-[rgba(192,132,252,0.06)]">
                            <p className="text-[9px] uppercase text-[#6b6580]">{s.l}</p>
                            <p className="text-lg font-bold mt-1" style={{ color: s.c }}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg bg-[#1a1626] p-3 border border-[rgba(192,132,252,0.06)]">
                        <p className="text-[9px] uppercase text-[#6b6580] mb-2">ACTIVITE RECENTE</p>
                        {["Emma - Direct - Close", "Sarah - Indirect - Neutre", "Julie - Direct - Close"].map((a, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-[rgba(192,132,252,0.04)] last:border-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                            <span className="text-[11px] text-[#a09bb2]">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === "progression" && (
                    <div className="space-y-3 animate-fade-in text-center">
                      <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#c084fc] flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#c084fc 252deg, #2a2438 252deg)` }} />
                        <div className="absolute inset-[4px] rounded-full bg-[#14111c] flex items-center justify-center">
                          <span className="text-2xl font-bold text-[#c084fc]">70</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#c084fc]">Avance</p>
                      <div className="flex justify-center gap-2">
                        {["Close rate 40%", "Ressenti 20%", "Confiance 15%"].map((s) => (
                          <span key={s} className="text-[9px] px-2 py-1 rounded-full bg-[#1a1626] text-[#a09bb2]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === "missions" && (
                    <div className="space-y-3 animate-fade-in">
                      {[
                        { title: "5 closes cette semaine", pct: 60, xp: 50 },
                        { title: "10 sessions ce mois", pct: 30, xp: 100 },
                        { title: "Journal quotidien", pct: 85, xp: 30 },
                      ].map((m) => (
                        <div key={m.title} className="rounded-lg bg-[#1a1626] p-3 border border-[rgba(192,132,252,0.06)]">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs text-[#f0eef5]">{m.title}</span>
                            <span className="text-[10px] text-[#c084fc]">+{m.xp} XP</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#2a2438]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#c084fc] to-[#f472b6]" style={{ width: `${m.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "leaderboard" && (
                    <div className="space-y-2 animate-fade-in">
                      {[
                        { rank: 1, name: "Alex", xp: "4,520", color: "#f59e0b" },
                        { rank: 2, name: "Maxime", xp: "3,810", color: "#a09bb2" },
                        { rank: 3, name: "Julien", xp: "2,950", color: "#cd7f32" },
                        { rank: 4, name: "Toi", xp: "2,100", color: "#c084fc", highlight: true },
                      ].map((p) => (
                        <div key={p.rank} className={`flex items-center gap-3 p-2.5 rounded-lg ${p.highlight ? "bg-[#c084fc]/10 border border-[#c084fc]/20" : "bg-[#1a1626]"}`}>
                          <span className="w-6 text-center text-sm font-bold" style={{ color: p.color }}>{p.rank}</span>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center text-[10px] font-bold text-[#c084fc]">{p.name[0]}</div>
                          <span className="flex-1 text-sm text-[#f0eef5]">{p.name}</span>
                          <span className="text-xs text-[#a09bb2]">{p.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === "pipeline" && (
                    <div className="space-y-2 animate-fade-in">
                      {[
                        { name: "Emma", status: "Date planifié", color: "#818cf8" },
                        { name: "Sarah", status: "Répondu", color: "#34d399" },
                        { name: "Julie", status: "Nouveau", color: "#c084fc" },
                        { name: "Léa", status: "Contacté", color: "#f59e0b" },
                      ].map((c) => (
                        <div key={c.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1626]">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#f472b6]/20 flex items-center justify-center text-[10px] font-bold text-[#c084fc]">{c.name[0]}</div>
                          <span className="flex-1 text-sm text-[#f0eef5]">{c.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${c.color}15`, color: c.color }}>{c.status}</span>
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
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold mb-4">
                Chaque action te fait{" "}
                <span className="bg-gradient-to-r from-[#f472b6] to-[#f59e0b] bg-clip-text text-transparent">progresser</span>
              </h2>
            </div>
          </Section>

          {/* Flow */}
          <Section delay={100}>
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {["Interagis", "Gagne de l'XP", "Monte de niveau", "Debloque des badges", "Complete des missions", "Grimpe au classement"].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-full bg-[#14111c] border border-[rgba(192,132,252,0.1)] text-sm text-[#f0eef5] font-medium">{step}</span>
                  {i < 5 && <svg className="w-4 h-4 text-[#6b6580] hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>}
                </div>
              ))}
            </div>
          </Section>

          {/* Ranks */}
          <Section delay={200}>
            <div className="rounded-2xl border border-[rgba(192,132,252,0.06)] bg-[#14111c] p-8 mb-8">
              <h3 className="text-center text-sm font-semibold text-[#a09bb2] uppercase tracking-wider mb-8">Systeme de rang</h3>
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {RANKS.map((r, i) => (
                  <div key={r.name} className="flex flex-col items-center gap-2 min-w-[80px]">
                    <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: r.color, color: r.color }}>
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-medium text-center" style={{ color: r.color }}>{r.name}</span>
                    {i < RANKS.length - 1 && <div className="hidden" />}
                  </div>
                ))}
              </div>
              {/* Progress line */}
              <div className="mt-4 h-1 rounded-full bg-[#2a2438] mx-8 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6b6580] via-[#c084fc] to-[#f59e0b]" style={{ width: "65%" }} />
              </div>
            </div>
          </Section>

          {/* Badges preview */}
          <Section delay={300}>
            <div className="rounded-2xl border border-[rgba(192,132,252,0.06)] bg-[#14111c] p-8">
              <h3 className="text-center text-sm font-semibold text-[#a09bb2] uppercase tracking-wider mb-6">18+ badges a debloquer</h3>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-3 justify-items-center">
                {Array.from({ length: 18 }).map((_, i) => {
                  const unlocked = i < 8;
                  return (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${unlocked ? "bg-gradient-to-br from-[#c084fc]/20 to-[#f472b6]/20 border border-[#c084fc]/20 shadow-[0_0_12px_-4px_rgba(192,132,252,0.3)]" : "bg-[#1a1626] border border-[rgba(192,132,252,0.04)] opacity-40"}`}
                    >
                      {unlocked ? ["🎯", "🔥", "💬", "⭐", "🏆", "👑", "💎", "🚀"][i] : "?"}
                    </div>
                  );
                })}
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
                <div key={s.label} className="text-center p-6 rounded-2xl border border-[rgba(192,132,252,0.1)] bg-[#14111c] hover:border-[rgba(192,132,252,0.2)] transition-all hover:shadow-[0_0_32px_-8px_rgba(192,132,252,0.1)]">
                  <p className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold text-[#c084fc]">
                    <Counter end={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs text-[#6b6580] mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#818cf8]/[0.02] to-transparent" />
        <div className="max-w-4xl mx-auto relative">
          <Section>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#34d399] mb-3 block">Comment ca marche</span>
              <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-grotesk)] font-bold">
                3 etapes pour commencer
              </h2>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Section key={s.num} delay={i * 120}>
                <div className="text-center relative">
                  {/* Connector line */}
                  {i < 2 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t border-dashed border-[rgba(192,132,252,0.15)]" />}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c084fc]/10 to-[#818cf8]/10 border border-[rgba(192,132,252,0.1)] flex items-center justify-center mx-auto mb-4">
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
              <div className="absolute -inset-8 bg-gradient-to-r from-[#c084fc]/5 to-[#f472b6]/5 rounded-3xl blur-xl" />
              <div className="relative rounded-2xl border border-[rgba(192,132,252,0.1)] bg-[#14111c] p-10">
                <svg className="w-10 h-10 text-[#c084fc]/30 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
                </svg>
                <blockquote className="text-lg sm:text-xl text-[#f0eef5] leading-relaxed mb-6 font-medium">
                  &ldquo;GameProgress a change ma facon de voir la progression. Chaque jour je vois mes stats monter, ca motive a fond. Le systeme de missions et de badges rend le process addictif.&rdquo;
                </blockquote>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center text-sm font-bold text-[#c084fc]">A</div>
                  <div>
                    <p className="text-sm font-semibold text-[#f0eef5]">Alex M.</p>
                    <p className="text-xs text-[#6b6580]">Utilisateur depuis 3 mois</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#c084fc]/[0.05] to-transparent" />
        <div className="max-w-3xl mx-auto relative text-center">
          <Section>
            <h2 className="text-3xl sm:text-5xl font-[family-name:var(--font-grotesk)] font-bold mb-6">
              Pret a transformer{" "}
              <span className="bg-gradient-to-r from-[#c084fc] via-[#f472b6] to-[#818cf8] bg-clip-text text-transparent">ton game</span> ?
            </h2>
            <p className="text-lg text-[#a09bb2] mb-10">
              Rejoins GameProgress et commence a tracker ta progression des aujourd&apos;hui.
            </p>
            <Link href="/login" className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-lg font-semibold text-white hover:shadow-[0_0_48px_-8px_rgba(192,132,252,0.5)] transition-all hover:scale-105 active:scale-95 animate-neon-pulse">
              S&apos;inscrire maintenant
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
            <p className="text-sm text-[#6b6580] mt-4">C&apos;est gratuit, pour toujours.</p>
          </Section>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[rgba(192,132,252,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.webp" alt="GameProgress" width={32} height={32} className="rounded-lg" />
              <span className="font-[family-name:var(--font-grotesk)] font-bold">GameProgress</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-xs text-[#6b6580] hover:text-[#a09bb2] transition-colors">Fonctionnalités</a>
              <a href="#showcase" className="text-xs text-[#6b6580] hover:text-[#a09bb2] transition-colors">Aperçu</a>
              <a href="#gamification" className="text-xs text-[#6b6580] hover:text-[#a09bb2] transition-colors">Gamification</a>
              <a href="#how" className="text-xs text-[#6b6580] hover:text-[#a09bb2] transition-colors">Comment ça marche</a>
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
