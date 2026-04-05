"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { PLAN_NAME_PRO, REFERRAL_PRO_DAYS } from "@/lib/premium";
import { fetchReferralStatsAction, fetchReferralCodeAction } from "@/actions/db";

interface ReferralStats {
  code: string;
  referralCount: number;
  convertedCount: number;
  earnedDays: number;
}

export default function ReferralPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const [statsData, codeData] = await Promise.all([
        fetchReferralStatsAction(),
        fetchReferralCodeAction(),
      ]);
      setStats({
        code: codeData || "",
        referralCount: statsData?.referralCount ?? 0,
        convertedCount: statsData?.convertedCount ?? 0,
        earnedDays: statsData?.earnedDays ?? 0,
      });
    } catch {
      // First time — no referral data yet
      const code = await fetchReferralCodeAction();
      setStats({ code: code || "", referralCount: 0, convertedCount: 0, earnedDays: 0 });
    }
    setLoading(false);
  }, [session?.user?.email]);

  useEffect(() => { load(); }, [load]);

  const referralLink = stats?.code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${stats.code}`
    : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.show("Lien copié !");
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "GameProgress — Rejoins-moi !",
          text: `Rejoins GameProgress et obtiens ${REFERRAL_PRO_DAYS} jours de ${PLAN_NAME_PRO} offerts !`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#34d399] to-[#818cf8] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)]">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold text-[var(--on-surface)] mb-2">
          Parrainage
        </h1>
        <p className="text-sm text-[var(--outline)]">
          Invite tes potes et gagnez tous les deux des jours de {PLAN_NAME_PRO}.
        </p>
      </div>

      {/* How it works */}
      <Card glass className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-4">Comment ça marche</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Partage ton lien",
              desc: "Envoie ton lien unique à tes potes",
              icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z",
            },
            {
              step: "2",
              title: "Il s'inscrit",
              desc: `Il obtient ${REFERRAL_PRO_DAYS}j de ${PLAN_NAME_PRO}`,
              icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
            },
            {
              step: "3",
              title: "Tu gagnes aussi",
              desc: `${REFERRAL_PRO_DAYS}j offerts, 1 mois si il souscrit`,
              icon: "M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--surface-high)] flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <p className="text-xs font-semibold text-[var(--on-surface)] mb-0.5">{s.title}</p>
              <p className="text-[10px] text-[var(--outline)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral link */}
      <Card glass className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Ton lien de parrainage</h2>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2.5 rounded-[10px] bg-[var(--surface-high)] text-xs text-[var(--on-surface-variant)] font-mono truncate border border-[var(--border)]">
            {referralLink || "Chargement..."}
          </div>
          <Button onClick={copyLink} size="sm">Copier</Button>
          <Button onClick={shareLink} variant="secondary" size="sm">Partager</Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Filleuls inscrits", value: stats?.referralCount ?? 0, color: "text-[var(--primary)]" },
          { label: "Convertis en Pro", value: stats?.convertedCount ?? 0, color: "text-[#34d399]" },
          { label: "Jours gagnés", value: stats?.earnedDays ?? 0, color: "text-[#f59e0b]" },
        ].map((s) => (
          <Card key={s.label} glass className="text-center !p-4">
            <p className={`text-2xl font-[family-name:var(--font-grotesk)] font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--outline)] mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card glass>
        <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">Conseils pour parrainer</h2>
        <ul className="space-y-2">
          {[
            "Montre l'app à tes potes en soirée quand tu log une interaction",
            "Partage ton lien dans les groupes WhatsApp/Telegram de wings",
            "Poste ton lien de parrainage dans le feed avec tes stats",
            "Challenge un pote : \"installe l'app et on compare nos stats\"",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-[var(--on-surface-variant)]">
              <svg className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
