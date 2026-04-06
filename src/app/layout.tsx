import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickAddButton } from "@/components/layout/QuickAddButton";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { Tutorial } from "@/components/layout/Tutorial";
import { TopBar } from "@/components/layout/TopBar";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { PageTabs } from "@/components/layout/PageTabs";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "GameProgress - Tracker de Progression Sociale",
    template: "%s | GameProgress",
  },
  description: "Application gamifiée de développement personnel et de progression sociale. Suivez vos interactions, définissez des missions et montez en niveau.",
  manifest: "/manifest.json",
  keywords: ["développement personnel", "gamification", "progression", "social skills", "tracker"],
  authors: [{ name: "Mathieu Guicheteau" }],
  creator: "MathBusiness",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "GameProgress",
    title: "GameProgress - Tracker de Progression Sociale",
    description: "Application gamifiée de développement personnel. Suivez vos interactions, montez en niveau et déverrouillez des badges.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GameProgress" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameProgress - Tracker de Progression Sociale",
    description: "Application gamifiée de développement personnel. Suivez vos interactions, montez en niveau et déverrouillez des badges.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameProgress",
  },
};

export const viewport: Viewport = {
  themeColor: "#060510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('gameprogress-theme')||'light';document.documentElement.setAttribute('data-theme',t)})()` }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </head>
      <body className="font-[family-name:var(--font-inter)] antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-[12px] focus:text-sm">
          Aller au contenu
        </a>
        <AuthProvider>
          <ToastProvider>
            <AnnouncementBar />
            <div className="flex min-h-screen relative z-[1]">
              <Sidebar />
              <main id="main-content" className="flex-1 min-w-0 pb-20 lg:pb-0">
                <TopBar />
                <PageTabs />
                {children}
              </main>
            </div>
            <QuickAddButton />
            <MobileNav />
            <InstallPrompt />
            <Tutorial />
            <OfflineBanner />
            <GlobalSearch />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
