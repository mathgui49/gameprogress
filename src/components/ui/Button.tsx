import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:shadow-[0_0_20px_-4px_var(--neon-purple)] font-semibold",
  secondary: "bg-[var(--surface-high)] border border-[var(--border)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] hover:text-[var(--on-surface)] hover:border-[var(--border-hover)]",
  ghost: "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--border)]",
  danger: "bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-lg",
  lg: "px-6 py-3 text-sm rounded-lg",
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
