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
          ? "glass border border-[rgba(192,132,252,0.06)]"
          : "bg-[#1a1626] border border-[rgba(192,132,252,0.06)]",
        hover && "cursor-pointer transition-all duration-200 hover:bg-[#231e30] hover:border-[rgba(192,132,252,0.12)] hover:shadow-[0_0_24px_-8px_rgba(192,132,252,0.1)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
