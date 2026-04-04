"use client";

import type { Toast as ToastType } from "@/hooks/useToast";

const COLORS = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  error: "bg-[#ff6e84]/15 text-[#ff6e84] border-[#ff6e84]/20",
  info: "bg-[#85adff]/15 text-[#85adff] border-[#85adff]/20",
};

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer animate-scale-in shadow-[0_24px_48px_rgba(0,0,0,0.4)] ${COLORS[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
