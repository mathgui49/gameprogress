import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[#adaaab]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-xl bg-black px-4 py-2.5 text-sm text-white placeholder:text-[#484849]",
          "border border-transparent outline-none transition-all",
          "focus:border-[#85adff]/40 focus:shadow-[0_0_0_3px_rgba(133,173,255,0.08)]",
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
        <label htmlFor={id} className="block text-xs font-medium text-[#adaaab]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full rounded-xl bg-black px-4 py-3 text-sm text-white placeholder:text-[#484849]",
          "border border-transparent outline-none transition-all resize-none",
          "focus:border-[#85adff]/40 focus:shadow-[0_0_0_3px_rgba(133,173,255,0.08)]",
          className
        )}
        {...props}
      />
    </div>
  );
}
