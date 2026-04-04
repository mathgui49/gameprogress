import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[#adaaab]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full rounded-xl bg-black px-4 py-2.5 text-sm text-white",
          "border border-transparent outline-none transition-all appearance-none",
          "focus:border-[#85adff]/40 focus:shadow-[0_0_0_3px_rgba(133,173,255,0.08)]",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a191b]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
