interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, message, action, className }: EmptyStateProps) {
  return (
    <section
      className={`rounded-xl border border-brand-100 bg-brand-50 p-4 text-brand-800 ${className ?? ''}`.trim()}
      role="status"
      aria-live="polite"
    >
      {title ? <h3 className="text-base font-bold text-brand-900">{title}</h3> : null}
      <p className={title ? 'mt-1 text-sm' : 'text-sm'}>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
