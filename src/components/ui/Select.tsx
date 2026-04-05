import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[var(--on-surface-variant)]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full rounded-[12px] bg-[var(--surface-low)] px-4 py-2.5 text-sm text-[var(--on-surface)]",
          "border border-[var(--border)] outline-none transition-all appearance-none",
          "focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--neon-purple)]",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--surface)]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
