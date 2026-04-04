import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-grotesk)] tracking-wide transition-colors",
        className ?? "bg-[#231e30] text-[#a09bb2]"
      )}
    >
      {children}
    </span>
  );
}
