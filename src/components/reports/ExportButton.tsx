"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/hooks/useSubscription";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

// A4 dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 18;
const FOOTER_H = 10;
const CONTENT_Y = MARGIN + HEADER_H;
const CONTENT_MAX_H = PAGE_H - MARGIN * 2 - HEADER_H - FOOTER_H;

export function ExportButton({ targetRef }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const { isPremium } = useSubscription();

  const captureSection = useCallback(async (el: HTMLElement) => {
    const html2canvas = (await import("html2canvas-pro")).default;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: isDark ? "#0f0a1e" : "#f8f7fc",
      logging: false,
    });
    return canvas;
  }, []);

  const drawHeader = (pdf: any, title: string) => {
    // Brand bar
    pdf.setFillColor(192, 132, 252);
    pdf.rect(0, 0, PAGE_W, 6, "F");

    // App name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(192, 132, 252);
    pdf.text("GameProgress", MARGIN, 18);

    // Section title
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(140, 140, 160);
    pdf.text(title, MARGIN + 62, 18);
  };

  const drawFooter = (pdf: any, pageNum: number, totalPages: number, dateStr: string) => {
    const y = PAGE_H - MARGIN;

    // Separator line
    pdf.setDrawColor(60, 50, 80);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y - 6, PAGE_W - MARGIN, y - 6);

    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 140);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Rapport généré le ${dateStr}`, MARGIN, y);
    pdf.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, y, { align: "right" });

    // Tiny branding
    pdf.setTextColor(192, 132, 252);
    pdf.text("GameProgress", PAGE_W / 2, y, { align: "center" });
  };

  const exportPDF = useCallback(async () => {
    if (!targetRef.current) return;
    setExporting(true);
    setOpen(false);
    setProgress("Préparation...");

    try {
      const { jsPDF } = await import("jspdf");

      // Find all sections
      const sections = targetRef.current.querySelectorAll("[data-pdf-section]");
      if (sections.length === 0) {
        setProgress("Aucune section trouvée");
        return;
      }

      const dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Capture all sections
      const captures: { title: string; canvas: HTMLCanvasElement }[] = [];
      for (let i = 0; i < sections.length; i++) {
        const el = sections[i] as HTMLElement;
        const title = el.getAttribute("data-pdf-section") || `Section ${i + 1}`;
        setProgress(`Capture ${i + 1}/${sections.length}...`);
        const canvas = await captureSection(el);
        captures.push({ title, canvas });
      }

      setProgress("Génération du PDF...");

      // Plan pages: each section gets its own page, but small sections can be grouped
      type PageContent = { title: string; canvas: HTMLCanvasElement; y: number; h: number }[];
      const pages: PageContent[] = [];

      // Page 1: Cover page (no capture, drawn programmatically)
      pages.push([]);

      // Place sections on pages - try to fit 2 small sections per page
      let currentPage: PageContent = [];
      let currentY = 0;

      for (const cap of captures) {
        const aspectRatio = cap.canvas.height / cap.canvas.width;
        const imgW = CONTENT_W;
        const imgH = imgW * aspectRatio;
        // Scale down if taller than max
        const scaledH = Math.min(imgH, CONTENT_MAX_H);

        if (currentY + scaledH > CONTENT_MAX_H && currentPage.length > 0) {
          // Section doesn't fit on current page, start new page
          pages.push(currentPage);
          currentPage = [];
          currentY = 0;
        }

        currentPage.push({
          title: cap.title,
          canvas: cap.canvas,
          y: currentY,
          h: scaledH,
        });
        currentY += scaledH + 8; // 8mm gap between sections
      }
      if (currentPage.length > 0) pages.push(currentPage);

      const totalPages = pages.length;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

      // ─── Page 1: Cover ───
      // Dark background
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";
      if (isDark) {
        pdf.setFillColor(15, 10, 30);
        pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
      }

      // Top gradient bar
      pdf.setFillColor(192, 132, 252);
      pdf.rect(0, 0, PAGE_W, 6, "F");

      const centerX = PAGE_W / 2;
      const logoY = 90;

      // Decorative circle (light tint)
      pdf.setFillColor(isDark ? 30 : 240, isDark ? 20 : 235, isDark ? 50 : 250);
      pdf.circle(centerX, logoY, 35, "F");

      // App name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(32);
      pdf.setTextColor(192, 132, 252);
      pdf.text("GameProgress", centerX, logoY - 2, { align: "center" });

      // Subtitle
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(13);
      pdf.setTextColor(isDark ? 180 : 80, isDark ? 180 : 80, isDark ? 200 : 100);
      pdf.text("Rapport Statistiques", centerX, logoY + 14, { align: "center" });

      // Separator line
      pdf.setDrawColor(192, 132, 252);
      pdf.setLineWidth(0.5);
      pdf.line(centerX - 40, logoY + 24, centerX + 40, logoY + 24);

      // Date
      pdf.setFontSize(11);
      pdf.setTextColor(isDark ? 160 : 100, isDark ? 160 : 100, isDark ? 180 : 120);
      pdf.text(dateStr, centerX, logoY + 38, { align: "center" });

      // Table of contents
      const tocY = 175;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(isDark ? 200 : 60, isDark ? 200 : 60, isDark ? 220 : 80);
      pdf.text("Contenu du rapport", centerX, tocY - 12, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      captures.forEach((cap, i) => {
        const y = tocY + i * 9;
        // Light background pill
        pdf.setFillColor(isDark ? 25 : 245, isDark ? 18 : 240, isDark ? 45 : 252);
        pdf.roundedRect(centerX - 50, y - 4, 100, 7, 2, 2, "F");
        pdf.setTextColor(isDark ? 200 : 80, isDark ? 200 : 80, isDark ? 220 : 100);
        pdf.text(`${i + 1}. ${cap.title}`, centerX, y, { align: "center" });
      });

      // Footer on cover
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 140);
      pdf.text("Généré automatiquement par GameProgress", centerX, PAGE_H - 20, { align: "center" });

      // ─── Content pages ───
      for (let p = 1; p < pages.length; p++) {
        pdf.addPage();
        const page = pages[p];

        if (isDark) {
          pdf.setFillColor(15, 10, 30);
          pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
        }

        // Header with first section's title
        drawHeader(pdf, page.map((s) => s.title).join(" & "));

        // Draw each section on this page
        for (const section of page) {
          const imgW = CONTENT_W;
          const aspectRatio = section.canvas.height / section.canvas.width;
          let imgH = imgW * aspectRatio;
          let finalW = imgW;

          // Scale down if needed
          if (imgH > CONTENT_MAX_H) {
            const scale = CONTENT_MAX_H / imgH;
            finalW = imgW * scale;
            imgH = CONTENT_MAX_H;
          }

          const offsetX = MARGIN + (CONTENT_W - finalW) / 2;
          // Use JPEG for smaller file size
          const imgData = section.canvas.toDataURL("image/jpeg", 0.85);
          pdf.addImage(imgData, "JPEG", offsetX, CONTENT_Y + section.y, finalW, imgH);
        }

        // Footer
        drawFooter(pdf, p + 1, totalPages, dateStr);
      }

      // Save
      setProgress("Enregistrement...");
      pdf.save(`rapport-gameprogress-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      setProgress("Erreur lors de l'export");
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress("");
      }, 1000);
    }
  }, [targetRef, captureSection]);

  const exportPNG = useCallback(async () => {
    if (!targetRef.current) return;
    setExporting(true);
    setOpen(false);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.getAttribute("data-theme") === "light" ? "#f8f7fc" : "#0f0a1e",
      });
      const link = document.createElement("a");
      link.download = `rapport-gameprogress-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }, [targetRef]);

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
          {exporting && progress ? progress : "Exporter"}
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
              PDF multi-pages
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
