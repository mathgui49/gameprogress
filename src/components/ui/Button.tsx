import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:shadow-[0_0_20px_-4px_var(--neon-purple)] font-semibold",
  secondary: "glass-card text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--glass-border-hover)]",
  ghost: "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--border)]",
  danger: "bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 border border-[var(--error)]/10",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-[10px]",
  md: "px-4 py-2.5 text-sm rounded-[12px]",
  lg: "px-6 py-3 text-sm rounded-[14px]",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
