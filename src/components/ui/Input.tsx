import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[#a09bb2]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-lg bg-[#100e17] px-4 py-2.5 text-sm text-[#f0eef5] placeholder:text-[#3d3650]",
          "border border-[rgba(192,132,252,0.06)] outline-none transition-all",
          "focus:border-[#c084fc]/30 focus:shadow-[0_0_0_3px_rgba(192,132,252,0.06)]",
          className
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
        <label htmlFor={id} className="block text-xs font-medium text-[#a09bb2]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full rounded-lg bg-[#100e17] px-4 py-3 text-sm text-[#f0eef5] placeholder:text-[#3d3650]",
          "border border-[rgba(192,132,252,0.06)] outline-none transition-all resize-none",
          "focus:border-[#c084fc]/30 focus:shadow-[0_0_0_3px_rgba(192,132,252,0.06)]",
          className
        )}
        {...props}
      />
    </div>
  );
}
