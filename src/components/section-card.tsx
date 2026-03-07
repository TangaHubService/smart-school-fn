import { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-brand-100 bg-white/92">
      <div className="flex items-start justify-between gap-3 border-b border-brand-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-700">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
