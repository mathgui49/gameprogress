import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[#a09bb2]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full rounded-lg bg-[#100e17] px-4 py-2.5 text-sm text-[#f0eef5]",
          "border border-[rgba(192,132,252,0.06)] outline-none transition-all appearance-none",
          "focus:border-[#c084fc]/30 focus:shadow-[0_0_0_3px_rgba(192,132,252,0.06)]",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#14111c]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
