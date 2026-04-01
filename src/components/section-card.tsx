import { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="">
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-700">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      <div className="p-1 sm:p-2">{children}</div>
    </section>
  );
}
