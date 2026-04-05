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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-[family-name:var(--font-inter)] antialiased">
        <AuthProvider>
          <AnnouncementBar />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 pb-20 lg:pb-0">
              <TopBar />
              {children}
            </main>
          </div>
          <QuickAddButton />
          <MobileNav />
          <InstallPrompt />
          <Tutorial />
        </AuthProvider>
      </body>
    </html>
  );
}
