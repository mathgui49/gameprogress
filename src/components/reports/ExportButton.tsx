"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/hooks/useSubscription";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function ExportButton({ targetRef }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isPremium } = useSubscription();

  const capture = useCallback(async () => {
    if (!targetRef.current) return null;
    const html2canvas = (await import("html2canvas-pro")).default;
    // A4 at 2x: 794 × 1123 CSS px → 1588 × 2246 canvas px
    const canvas = await html2canvas(targetRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: document.documentElement.getAttribute("data-theme") === "light" ? "#f8f7fc" : "#0f0a1e",
      width: 794,
      windowWidth: 794,
    });
    return canvas;
  }, [targetRef]);

  const exportPNG = useCallback(async () => {
    setExporting(true);
    setOpen(false);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `rapport-gameprogress-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }, [capture]);

  const exportPDF = useCallback(async () => {
    setExporting(true);
    setOpen(false);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      // A4 dimensions in mm
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height / canvas.width) * imgW;

      if (imgH <= pageH) {
        // Fits on one page
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, imgH);
      } else {
        // Scale to fit one page
        const scale = pageH / imgH;
        const scaledW = imgW * scale;
        const offsetX = (pageW - scaledW) / 2;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", offsetX, 0, scaledW, pageH);
      }

      pdf.save(`rapport-gameprogress-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }, [capture]);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => isPremium && setOpen(!open)}
        disabled={exporting || !isPremium}
        title={isPremium ? undefined : "Export réservé à GameMax"}
      >
        <span className="flex items-center gap-2">
          {exporting ? (
            <div className="w-4 h-4 border-2 border-[var(--on-surface-variant)]/30 border-t-[var(--on-surface-variant)] rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          Exporter
        </span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[140px]"
          >
            <button
              onClick={exportPDF}
              className="w-full px-4 py-2.5 text-sm text-left text-[var(--on-surface)] hover:bg-[var(--surface-highest)] flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4 text-[#fb7185]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              PDF (A4)
            </button>
            <button
              onClick={exportPNG}
              className="w-full px-4 py-2.5 text-sm text-left text-[var(--on-surface)] hover:bg-[var(--surface-highest)] flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4 text-[#c084fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
              PNG
            </button>
          </div>
        </>
      )}
    </div>
  );
}
