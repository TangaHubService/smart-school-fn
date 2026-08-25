import clsx from 'clsx';

export type PageSkeletonVariant = 'dashboard' | 'table' | 'detail' | 'form' | 'public';

interface SkeletonProps {
  className?: string;
  label?: string;
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <span
      className={clsx('app-skeleton block', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      aria-busy={label ? true : undefined}
      role={label ? 'status' : undefined}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={clsx('h-3 rounded-full', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 4,
  showAvatar = true,
  className,
}: {
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <LoadingRegion label="Loading list" className={clsx('space-y-3', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
        >
          {showAvatar ? <Skeleton className="h-10 w-10 shrink-0 rounded-full" /> : null}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5 rounded-full" />
            <Skeleton className="h-2.5 w-3/4 rounded-full" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
  compact = false,
}: {
  rows?: number;
  columns?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <LoadingRegion
      label="Loading table"
      className={clsx('overflow-hidden rounded-xl border border-slate-200 bg-white', className)}
    >
      <div
        className="grid gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2.5 w-3/4 rounded-full" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 px-4">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className={clsx('grid items-center gap-3', compact ? 'py-2.5' : 'py-4')}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={clsx(
                  'rounded-full',
                  compact ? 'h-2.5' : 'h-3',
                  columnIndex === columns - 1 ? 'w-1/2' : 'w-4/5'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function CardGridSkeleton({
  count = 6,
  className,
  cardClassName,
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <LoadingRegion
      label="Loading cards"
      className={clsx('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={clsx(
            'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
            cardClassName
          )}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3 rounded-full" />
              <Skeleton className="h-2.5 w-1/2 rounded-full" />
            </div>
          </div>
          <SkeletonText lines={3} className="mt-5" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function PageSkeleton({
  variant = 'table',
  className,
  fullScreen = false,
}: {
  variant?: PageSkeletonVariant;
  className?: string;
  fullScreen?: boolean;
}) {
  return (
    <LoadingRegion
      label="Loading page"
      className={clsx(
        'w-full bg-slate-50/70',
        fullScreen ? 'min-h-screen p-5 sm:p-8' : 'min-h-[420px] rounded-2xl p-1',
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1680px] space-y-5">
        {variant === 'public' ? <PublicSkeleton /> : <PageHeadingSkeleton />}
        {variant === 'dashboard' ? <DashboardBodySkeleton /> : null}
        {variant === 'table' ? <TableSkeleton rows={7} columns={6} /> : null}
        {variant === 'detail' ? <DetailSkeleton /> : null}
        {variant === 'form' ? <FormSkeleton /> : null}
        {variant === 'public' ? <CardGridSkeleton count={3} className="lg:grid-cols-3" /> : null}
      </div>
    </LoadingRegion>
  );
}

export function InlineSkeleton({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className={clsx('flex items-center gap-3', className)}>
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3 rounded-full" />
        <Skeleton className="h-2.5 w-2/3 rounded-full" />
      </div>
    </LoadingRegion>
  );
}

function PageHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52 rounded-lg" />
        <Skeleton className="h-3 w-80 max-w-full rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="mt-5 h-3 w-2/3 rounded-full" />
            <Skeleton className="mt-2 h-7 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl border border-slate-200" />
        <Skeleton className="h-72 rounded-2xl border border-slate-200" />
      </div>
      <TableSkeleton rows={4} columns={5} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-7 w-2/5 rounded-lg" />
        <SkeletonText lines={5} className="mt-6" />
        <Skeleton className="mt-6 h-48 rounded-xl" />
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-1/2 rounded-lg" />
        <SkeletonText lines={6} />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-24 rounded-xl" />
      <Skeleton className="mt-6 h-10 w-32 rounded-lg" />
    </div>
  );
}

function PublicSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
      <Skeleton className="mx-auto h-4 w-32 rounded-full" />
      <Skeleton className="mx-auto mt-5 h-9 w-[32rem] max-w-full rounded-xl" />
      <Skeleton className="mx-auto mt-4 h-3 w-[42rem] max-w-full rounded-full" />
      <Skeleton className="mx-auto mt-2 h-3 w-[34rem] max-w-full rounded-full" />
      <div className="mt-7 flex justify-center gap-3">
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <Skeleton className="mt-10 h-60 rounded-2xl" />
    </div>
  );
}

function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
