interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#c084fc]/10 flex items-center justify-center text-[#c084fc] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[#f0eef5]/80 mb-2">{title}</h3>
      <p className="text-sm text-[#6b6580] max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
