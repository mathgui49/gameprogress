import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] px-2.5 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-grotesk)] tracking-wide transition-colors",
        className ?? "bg-[var(--surface-bright)] text-[var(--on-surface-variant)]"
      )}
    >
      {children}
    </span>
  );
}
