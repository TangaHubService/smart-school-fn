import clsx from 'clsx';
import { Bell, CalendarDays, Megaphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export type AnnouncementPriority = 'URGENT' | 'HIGH' | 'NORMAL' | string;

export interface AnnouncementListItem {
  id: string;
  title: string;
  excerpt?: string;
  publishedAt?: string | null;
  to?: string;
  priority?: AnnouncementPriority;
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function priorityIcon(priority: AnnouncementPriority | undefined): LucideIcon {
  if (priority === 'URGENT') return Megaphone;
  if (priority === 'HIGH') return CalendarDays;
  return Bell;
}

function priorityClasses(priority: AnnouncementPriority | undefined): string {
  if (priority === 'URGENT') return 'bg-rose-50 text-rose-600';
  if (priority === 'HIGH') return 'bg-orange-50 text-orange-600';
  return 'bg-blue-50 text-blue-600';
}

export function AnnouncementList({
  items,
  isLoading = false,
  loadingRows = 3,
  emptyMessage = 'No announcements yet.',
  excerptMaxLength = 140,
  className,
}: {
  items: AnnouncementListItem[];
  isLoading?: boolean;
  loadingRows?: number;
  emptyMessage?: string;
  excerptMaxLength?: number;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className={clsx('space-y-3 p-4', className)} role="status" aria-live="polite">
        {Array.from({ length: loadingRows }, (_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={clsx('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 max-w-xs text-xs leading-5 text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className={clsx('divide-y divide-slate-100', className)}>
      {items.map((item) => {
        const Icon = priorityIcon(item.priority);
        const excerpt =
          item.excerpt && item.excerpt.length > excerptMaxLength
            ? `${item.excerpt.slice(0, excerptMaxLength).trimEnd()}…`
            : item.excerpt;

        const content = (
          <>
            <span
              className={clsx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                priorityClasses(item.priority)
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-900 group-hover:text-brand-600">
                  {item.title}
                </span>
                {item.publishedAt ? (
                  <span className="shrink-0 text-[9px] text-slate-400">
                    {formatRelativeTime(item.publishedAt)}
                  </span>
                ) : null}
              </span>
              {excerpt ? (
                <span className="mt-1 block overflow-hidden text-[10px] leading-4 text-slate-500">
                  {excerpt}
                </span>
              ) : null}
            </span>
          </>
        );

        if (item.to) {
          return (
            <li key={item.id}>
              <Link to={item.to} className="group flex gap-3 py-3">
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li key={item.id} className="flex gap-3 py-3">
            {content}
          </li>
        );
      })}
    </ul>
  );
}
