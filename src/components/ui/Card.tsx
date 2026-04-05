import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  glass?: boolean;
}

export function Card({ children, className, hover, onClick, glass }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card)] p-5",
        glass
          ? "glass-card glass-reflect"
          : "glass-card glass-reflect",
        hover && "cursor-pointer transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_0_12px_-4px_var(--neon-purple)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
