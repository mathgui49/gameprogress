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
          ? "glass border-t border-white/[0.06]"
          : "bg-[#1a191b] border-t border-white/[0.04]",
        hover && "cursor-pointer transition-all duration-200 hover:bg-[#201f21] hover:scale-[1.005]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
