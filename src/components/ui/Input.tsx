import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[var(--on-surface-variant)]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-[12px] bg-[var(--surface-low)] px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)]",
          "border border-[var(--border)] outline-none transition-all",
          "focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--neon-purple)]",
        )}
        {...props}
      />
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className, id, ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[var(--on-surface-variant)]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full rounded-[12px] bg-[var(--surface-low)] px-4 py-3 text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)]",
          "border border-[var(--border)] outline-none transition-all resize-none",
          "focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--neon-purple)]",
          className
        )}
        {...props}
      />
    </div>
  );
}
