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
        "rounded-xl p-5",
        glass
          ? "glass border border-[var(--border)]"
          : "bg-[var(--surface-high)] border border-[var(--border)]",
        hover && "cursor-pointer transition-all duration-200 hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] hover:shadow-[0_0_24px_-8px_var(--neon-purple)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
