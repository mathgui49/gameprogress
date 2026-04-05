"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { PLAN_NAME_PRO, AMBASSADOR_COMMISSION_PERCENT, PRICE_MONTHLY } from "@/lib/premium";
import { fetchAmbassadorStatsAction, fetchAmbassadorCodeAction } from "@/actions/db";

interface AmbassadorStats {
  code: string;
  totalReferrals: number;
  activeSubscribers: number;
  totalEarnings: number;
  monthlyEarnings: number;
  isApproved: boolean;
}

export default function AmbassadeurPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [stats, setStats] = useState<AmbassadorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const [statsData, codeData] = await Promise.all([
        fetchAmbassadorStatsAction(),
        fetchAmbassadorCodeAction(),
      ]);
      if (statsData) {
        setStats({
          code: codeData || "",
          totalReferrals: statsData.totalReferrals ?? 0,
          activeSubscribers: statsData.activeSubscribers ?? 0,
          totalEarnings: statsData.totalEarnings ?? 0,
          monthlyEarnings: statsData.monthlyEarnings ?? 0,
          isApproved: statsData.isApproved ?? false,
        });
      }
    } catch {}
    setLoading(false);
  }, [session?.user?.email]);

  useEffect(() => { load(); }, [load]);

  const applyAsAmbassador = async () => {
    setApplying(true);
    // For now, just show confirmation — in production this would submit an application
    setTimeout(() => {
      setApplied(true);
      setApplying(false);
      toast.show("Candidature envoyée ! Nous te recontactons sous 48h.");
    }, 1000);
  };

  const commissionPerUser = +(PRICE_MONTHLY * AMBASSADOR_COMMISSION_PERCENT / 100).toFixed(2);

  const ambassadorLink = stats?.code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?amb=${stats.code}`
    : "";

  const copyLink = () => {
    if (!ambassadorLink) return;
    navigator.clipboard.writeText(ambassadorLink);
    toast.show("Lien copié !");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not yet an ambassador — show application page
  if (!stats?.isApproved && !applied) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#f59e0b] to-[#f472b6] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-2">
            Programme Ambassadeur
          </h1>
          <p className="text-sm text-[var(--outline)] max-w-md mx-auto">
            Tu es coach, créateur de contenu ou influenceur dans la séduction/développement perso ?
            Deviens ambassadeur GameProgress et gagne de l&apos;argent.
          </p>
        </div>

        {/* Benefits */}
        <Card glass className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-4">Ce que tu gagnes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: `${AMBASSADOR_COMMISSION_PERCENT}% de commission récurrente`,
                desc: `${commissionPerUser}\u20AC/mois par utilisateur ${PLAN_NAME_PRO} que tu ramènes, tant qu'il reste abonné`,
                icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
                color: "text-[#f59e0b]",
              },
              {
                title: `${PLAN_NAME_PRO} gratuit à vie`,
                desc: "Accès complet à toutes les fonctionnalités en tant qu'ambassadeur",
                icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
                color: "text-[var(--primary)]",
              },
              {
                title: "Dashboard de suivi",
                desc: "Visualise tes conversions, revenus et performance en temps réel",
                icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
                color: "text-[#34d399]",
              },
              {
                title: "Lien personnalisé",
                desc: "Ton propre lien de tracking pour mesurer chaque conversion",
                icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
                color: "text-[#818cf8]",
              },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--surface-high)] flex items-center justify-center shrink-0">
                  <svg className={`w-4.5 h-4.5 ${b.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={b.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--on-surface)]">{b.title}</p>
                  <p className="text-[10px] text-[var(--outline)] mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue simulation */}
        <Card glass className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-4">Simulation de revenus</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { users: 100, monthly: commissionPerUser * 100 },
              { users: 500, monthly: commissionPerUser * 500 },
              { users: 1000, monthly: commissionPerUser * 1000 },
            ].map((s) => (
              <div key={s.users} className="rounded-[12px] bg-[var(--surface-high)] p-3 border border-[var(--border)]">
                <p className="text-[10px] text-[var(--outline)] mb-1">{s.users} abonnés</p>
                <p className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[#34d399]">{s.monthly.toFixed(0)}&euro;</p>
                <p className="text-[9px] text-[var(--outline)]">/mois</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Who is it for */}
        <Card glass className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Pour qui ?</h2>
          <ul className="space-y-2">
            {[
              "Coachs dating et développement personnel",
              "Créateurs de contenu YouTube, TikTok, Instagram",
              "Podcasters lifestyle et masculinité",
              "Community managers de groupes séduction/social skills",
              "Organisateurs de bootcamps et événements",
            ].map((who) => (
              <li key={who} className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                <svg className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {who}
              </li>
            ))}
          </ul>
        </Card>

        <div className="text-center">
          <Button onClick={applyAsAmbassador} size="lg" disabled={applying}>
            {applying ? "Envoi en cours..." : "Devenir ambassadeur"}
          </Button>
          <p className="text-[10px] text-[var(--outline-variant)] mt-3">
            Nous vérifions chaque candidature sous 48h. Contacte-nous à ambassadeur@gameprogress.app
          </p>
        </div>
      </div>
    );
  }

  // Application submitted
  if (applied && !stats?.isApproved) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-[16px] bg-[#34d399]/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-2">
          Candidature envoyée !
        </h2>
        <p className="text-sm text-[var(--outline)]">
          Nous te recontactons sous 48h par email. En attendant, continue à progresser !
        </p>
      </div>
    );
  }

  // Approved ambassador — show dashboard
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#f59e0b] to-[#f472b6] flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-1">
          Dashboard Ambassadeur
        </h1>
        <p className="text-sm text-[var(--outline)]">
          {AMBASSADOR_COMMISSION_PERCENT}% de commission récurrente sur chaque abonné {PLAN_NAME_PRO}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Inscrits", value: stats?.totalReferrals ?? 0, color: "text-[var(--primary)]" },
          { label: "Abonnés Pro", value: stats?.activeSubscribers ?? 0, color: "text-[#34d399]" },
          { label: "Rev. mensuel", value: `${(stats?.monthlyEarnings ?? 0).toFixed(2)}\u20AC`, color: "text-[#f59e0b]" },
          { label: "Rev. total", value: `${(stats?.totalEarnings ?? 0).toFixed(2)}\u20AC`, color: "text-[#f472b6]" },
        ].map((s) => (
          <Card key={s.label} glass className="text-center !p-4">
            <p className={`text-xl font-[family-name:var(--font-grotesk)] font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--outline)] mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Ambassador link */}
      <Card glass className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Ton lien ambassadeur</h2>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2.5 rounded-[10px] bg-[var(--surface-high)] text-xs text-[var(--on-surface-variant)] font-mono truncate border border-[var(--border)]">
            {ambassadorLink || "Chargement..."}
          </div>
          <Button onClick={copyLink} size="sm">Copier</Button>
        </div>
        <p className="text-[10px] text-[var(--outline)] mt-2">
          Chaque utilisateur qui s&apos;inscrit via ce lien est tracké dans ton dashboard.
          Tu reçois {commissionPerUser}&euro;/mois par abonné {PLAN_NAME_PRO} actif.
        </p>
      </Card>

      {/* Tips for ambassadors */}
      <Card glass>
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Maximise tes revenus</h2>
        <ul className="space-y-2">
          {[
            "Mentionne GameProgress dans tes vidéos/posts avec ton lien en description",
            "Montre l'app en live : les gens veulent voir le produit en action",
            "Propose un tutoriel ou review complète de l'app",
            "Cible les communautés actives : forums, Discord, groupes Telegram",
            "Utilise l'app toi-même et partage tes stats — l'authenticité convertit",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-[var(--on-surface-variant)]">
              <svg className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
