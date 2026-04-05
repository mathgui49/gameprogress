"use client";

import { ToastContext, useToastState } from "@/hooks/useToast";
import type { Toast } from "@/hooks/useToast";

const COLORS = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  error: "bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/20",
  info: "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/20",
};

const ICONS: Record<Toast["type"], string> = {
  success: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  error: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  info: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const state = useToastState();

  return (
    <ToastContext.Provider value={state}>
      {children}
      <ToastContainer toasts={state.toasts} onDismiss={state.dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-lg text-sm font-medium cursor-pointer animate-scale-in shadow-lg ${COLORS[toast.type]}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[toast.type]} />
          </svg>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
