"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:items-center sm:pt-0" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 glass-heavy rounded-[var(--radius-xl)] p-6 max-h-[85vh] overflow-y-auto overscroll-contain animate-scale-in shadow-[0_0_64px_-16px_var(--neon-purple),0_32px_64px_-16px_rgba(0,0,0,0.5)] glass-reflect">
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)]">{title}</h2>
            <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--border)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
