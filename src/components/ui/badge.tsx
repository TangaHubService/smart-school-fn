import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'purple'
  | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-700 ring-amber-100',
  danger: 'bg-red-50 text-red-700 ring-red-100',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-100',
  info: 'bg-sky-50 text-sky-700 ring-sky-100',
};

const DOT_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  purple: 'bg-violet-500',
  info: 'bg-sky-500',
};

export function Badge({
  children,
  tone = 'neutral',
  withDot = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  withDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        BADGE_TONES[tone],
        className
      )}
    >
      {withDot ? (
        <span className={clsx('h-1.5 w-1.5 rounded-full', DOT_TONES[tone])} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}

export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | string;

const STATUS_META: Record<string, { tone: BadgeTone; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  INACTIVE: { tone: 'neutral', label: 'Inactive' },
  SUSPENDED: { tone: 'danger', label: 'Suspended' },
  PENDING: { tone: 'warning', label: 'Pending' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: EntityStatus;
  className?: string;
}) {
  const meta = STATUS_META[String(status).toUpperCase()] ?? {
    tone: 'neutral' as BadgeTone,
    label: String(status),
  };

  return (
    <Badge tone={meta.tone} withDot className={className}>
      {meta.label}
    </Badge>
  );
}

export type PlatformRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'PUBLIC_LEARNER'
  | 'GOV_AUDITOR'
  | string;

const ROLE_META: Record<string, { tone: BadgeTone; label: string }> = {
  SUPER_ADMIN: { tone: 'purple', label: 'Super Admin' },
  SCHOOL_ADMIN: { tone: 'brand', label: 'School Admin' },
  TEACHER: { tone: 'success', label: 'Teacher' },
  STUDENT: { tone: 'warning', label: 'Student' },
  PARENT: { tone: 'info', label: 'Parent' },
  PUBLIC_LEARNER: { tone: 'neutral', label: 'Learner' },
  GOV_AUDITOR: { tone: 'danger', label: 'Auditor' },
};

export function RoleBadge({ role, className }: { role: PlatformRole; className?: string }) {
  const meta = ROLE_META[String(role).toUpperCase()] ?? {
    tone: 'neutral' as BadgeTone,
    label: String(role)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };

  return <Badge tone={meta.tone} className={className}>{meta.label}</Badge>;
}
