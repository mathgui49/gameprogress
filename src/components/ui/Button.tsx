import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-white hover:shadow-[0_0_20px_-4px_rgba(192,132,252,0.5)] font-semibold",
  secondary: "bg-[#1a1626] border border-[rgba(192,132,252,0.1)] text-[#a09bb2] hover:bg-[#231e30] hover:text-[#f0eef5] hover:border-[rgba(192,132,252,0.2)]",
  ghost: "text-[#a09bb2] hover:text-[#f0eef5] hover:bg-[rgba(192,132,252,0.06)]",
  danger: "bg-[#fb7185]/10 text-[#fb7185] hover:bg-[#fb7185]/20",
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
