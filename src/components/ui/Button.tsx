import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-gradient-to-r from-[#85adff] to-[#6e9fff] text-[#002c66] hover:shadow-lg hover:shadow-[#85adff]/20 font-semibold",
  secondary: "bg-[#262627] text-[#adaaab] hover:bg-[#2c2c2d] hover:text-white",
  ghost: "text-[#adaaab] hover:text-white hover:bg-white/5",
  danger: "bg-[#ff6e84]/10 text-[#ff6e84] hover:bg-[#ff6e84]/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
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
