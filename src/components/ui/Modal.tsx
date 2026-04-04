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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#14111c] border border-[rgba(192,132,252,0.08)] rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-scale-in shadow-[0_0_48px_-12px_rgba(192,132,252,0.15)]">
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[#f0eef5]">{title}</h2>
            <button onClick={onClose} className="text-[#6b6580] hover:text-[#f0eef5] transition-colors text-xl leading-none">&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
