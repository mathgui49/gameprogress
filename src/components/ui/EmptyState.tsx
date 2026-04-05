interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-[family-name:var(--font-grotesk)] font-semibold text-[var(--on-surface)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--outline)] max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
