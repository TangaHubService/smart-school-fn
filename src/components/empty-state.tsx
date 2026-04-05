interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
  centered?: boolean;
}

export function EmptyState({ title, message, action, className, centered = true }: EmptyStateProps) {
  const containerClass = centered ? 'flex min-h-[60vh] items-center justify-center px-4 py-8 sm:px-6' : '';

  return (
    <div className={containerClass}>
      <section
        className={`rounded-xl border border-brand-100 bg-brand-50 p-4 text-slate-800 ${
          centered ? 'text-center' : ''
        } ${className ?? ''}`.trim()}
        role="status"
        aria-live="polite"
      >
        {title ? <h3 className="text-base font-bold text-slate-900">{title}</h3> : null}
        <p className={title ? 'mt-1 text-sm' : 'text-sm'}>{message}</p>
        {action ? (
          <div className={`mt-3 ${centered ? 'flex justify-center' : ''}`}>
            {action}
          </div>
        ) : null}
      </section>
    </div>
  );
}
