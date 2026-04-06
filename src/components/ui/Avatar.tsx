interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const s = SIZES[size];
  const initial = name?.[0]?.toUpperCase() || "?";

  if (src) {
    return (
      <div className={`${s} rounded-xl overflow-hidden shrink-0 ${className}`}>
        <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div className={`${s} rounded-xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center shrink-0 ${className}`}>
      <span className="font-bold text-[var(--primary)]">{initial}</span>
    </div>
  );
}
