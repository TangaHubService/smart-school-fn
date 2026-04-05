interface StateViewProps {
  title: string;
  message: string;
  action?: React.ReactNode;
  centered?: boolean;
}

export function StateView({ title, message, action, centered = true }: StateViewProps) {
  const containerClass = centered ? 'flex min-h-[60vh] items-center justify-center px-4 py-8 sm:px-6' : '';

  return (
    <div className={containerClass}>
      <section
        className="rounded-2xl border border-brand-100 bg-white/95 p-5 shadow-soft"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-700">{message}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </section>
    </div>
  );
}
