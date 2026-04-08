import { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  const hasTitleBlock = Boolean(title || subtitle);
  const hasHeader = hasTitleBlock || Boolean(action);

  return (
    <section className="">
      {hasHeader ? (
        <div
          className={`flex gap-3 px-5 sm:px-6 ${
            hasTitleBlock ? 'items-start justify-between' : 'justify-end'
          }`}
        >
          {hasTitleBlock ? (
            <div>
              {title ? <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-slate-700">{subtitle}</p> : null}
            </div>
          ) : null}
          {action ?? null}
        </div>
      ) : null}
      <div className="p-1 sm:p-2">{children}</div>
    </section>
  );
}
