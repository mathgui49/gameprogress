"use client";

import { useState, useRef, useCallback } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export function Tooltip({ text, children, position = "top", delay = 300, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className={`relative inline-flex ${className ?? ""}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-[var(--surface-bright)] border border-[var(--border)] text-[var(--on-surface-variant)] shadow-lg whitespace-nowrap pointer-events-none animate-fade-in ${positionClasses[position]}`}
        >
          {text}
        </span>
      )}
    </div>
  );
}
