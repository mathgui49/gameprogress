import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GameProgress — Tracker de progression sociale gamifié",
  description: "Tracker tes interactions, progresse avec des missions et XP, gère tes contacts en pipeline CRM. Gratuit, privé, conçu pour la communauté.",
  keywords: ["social skills", "tracker", "gamification", "progression", "CRM", "pipeline", "interactions"],
  openGraph: {
    title: "GameProgress — Tracker de progression sociale gamifié",
    description: "XP, missions, badges, classement, pipeline CRM. Tout pour suivre et améliorer ta game.",
    url: "https://gameprogress.app/landing",
    siteName: "GameProgress",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GameProgress — Tracker de progression sociale gamifié",
    description: "XP, missions, badges, classement, pipeline CRM. Tout pour suivre et améliorer ta game.",
  },
  alternates: {
    canonical: "https://gameprogress.app/landing",
    languages: { "fr-FR": "https://gameprogress.app/landing" },
  },
  other: {
    "geo.region": "FR",
    "geo.placename": "France",
    "content-language": "fr",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GameProgress",
  url: "https://gameprogress.app",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  description: "Tracker de progression sociale gamifié avec XP, missions, badges et pipeline CRM.",
  inLanguage: "fr",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
