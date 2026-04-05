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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "GameProgress - Tracker de Progression",
  description: "Application de tracking personnel et de progression sociale",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameProgress",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0a12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </head>
      <body className="font-[family-name:var(--font-inter)] antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-white focus:rounded-lg focus:text-sm">
          Aller au contenu
        </a>
        <AuthProvider>
          <ToastProvider>
            <AnnouncementBar />
            <div className="flex min-h-screen">
              <Sidebar />
              <main id="main-content" className="flex-1 min-w-0 pb-20 lg:pb-0">
                <TopBar />
                {children}
              </main>
            </div>
            <QuickAddButton />
            <MobileNav />
            <InstallPrompt />
            <Tutorial />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
