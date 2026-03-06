import { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-brand-900">{title}</h2>
          {subtitle ? <p className="text-sm text-brand-700">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}
