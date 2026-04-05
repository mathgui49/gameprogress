"use client";

import { useState, useEffect, useCallback } from "react";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { Button } from "@/components/ui/Button";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already installed
    const dismissed = getItem<boolean>(STORAGE_KEYS.ONBOARDED, false);
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (dismissed || standalone) return;

    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsMobile(mobile);
    setIsIOS(ios);

    // On Android/Chrome, intercept the beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Delay popup slightly so it doesn't appear instantly
    const timer = setTimeout(() => setShow(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    setItem(STORAGE_KEYS.ONBOARDED, true);
  }, []);

  const handleInstall = useCallback(async () => {
    if (installEvent) {
      (installEvent as any).prompt();
      const result = await (installEvent as any).userChoice;
      if (result.outcome === "accepted") {
        dismiss();
      }
    }
  }, [installEvent, dismiss]);

  if (!show || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-sm bg-[#14111c] border border-[rgba(192,132,252,0.08)] rounded-t-2xl sm:rounded-2xl p-6 shadow-[0_0_48px_-12px_rgba(192,132,252,0.2)] animate-scale-in mx-4 sm:mx-0">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#f472b6] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_-4px_rgba(192,132,252,0.5)]">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>

        <h2 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-white text-center mb-2">
          {isMobile ? "Ajouter a l'ecran d'accueil" : "Ajouter aux favoris"}
        </h2>

        <p className="text-sm text-[#a09bb2] text-center mb-5 leading-relaxed">
          {isMobile
            ? "Accede a GameTrack en un tap depuis ton ecran d'accueil, comme une app native."
            : "Ajoute GameTrack a tes favoris pour y acceder rapidement depuis ton navigateur."
          }
        </p>

        {/* Install button (Android/Chrome with beforeinstallprompt) */}
        {installEvent ? (
          <div className="space-y-3">
            <Button onClick={handleInstall} className="w-full">Installer l&apos;app</Button>
            <button onClick={dismiss} className="w-full text-sm text-[#6b6580] hover:text-[#a09bb2] transition-colors py-2">
              Plus tard
            </button>
          </div>
        ) : isIOS ? (
          /* iOS instructions */
          <div className="space-y-4">
            <div className="space-y-3 bg-[#0d0a12] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c084fc]/15 text-[#c084fc] flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p className="text-sm text-[#a09bb2]">Appuie sur le bouton <span className="text-white font-medium">Partager</span> <svg className="inline w-4 h-4 text-[#c084fc] -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3-3m0 0l3 3m-3-3v12" /></svg> en bas de Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c084fc]/15 text-[#c084fc] flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p className="text-sm text-[#a09bb2]">Choisis <span className="text-white font-medium">&quot;Sur l&apos;ecran d&apos;accueil&quot;</span></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c084fc]/15 text-[#c084fc] flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p className="text-sm text-[#a09bb2]">Confirme en appuyant sur <span className="text-white font-medium">Ajouter</span></p>
              </div>
            </div>
            <button onClick={dismiss} className="w-full text-sm text-[#6b6580] hover:text-[#a09bb2] transition-colors py-2">
              J&apos;ai compris
            </button>
          </div>
        ) : (
          /* Desktop / fallback instructions */
          <div className="space-y-4">
            <div className="space-y-3 bg-[#0d0a12] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c084fc]/15 text-[#c084fc] flex items-center justify-center text-xs font-bold shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </span>
                <p className="text-sm text-[#a09bb2]">Appuie sur <kbd className="px-1.5 py-0.5 rounded bg-[#1a1626] text-white text-xs font-mono">Ctrl+D</kbd> pour ajouter aux favoris</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c084fc]/15 text-[#c084fc] flex items-center justify-center text-xs font-bold shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                </span>
                <p className="text-sm text-[#a09bb2]">Ou clique sur l&apos;icone d&apos;installation <svg className="inline w-4 h-4 text-[#c084fc] -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> dans la barre d&apos;adresse</p>
              </div>
            </div>
            <button onClick={dismiss} className="w-full text-sm text-[#6b6580] hover:text-[#a09bb2] transition-colors py-2">
              J&apos;ai compris
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
