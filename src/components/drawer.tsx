import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DrawerProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'default' | 'wide' | 'compact';
  bodyClassName?: string;
  footerClassName?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  error?: ReactNode;
  onRetry?: () => void;
  onOpen?: () => void;
  role?: 'dialog' | 'alertdialog';
}

export function AppDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'default',
  bodyClassName = 'px-4 py-4 sm:px-5',
  footerClassName = 'px-4 py-4 sm:px-5',
  isLoading = false,
  loadingLabel = 'Loading...',
  error,
  onRetry,
  onOpen,
  role = 'dialog',
}: DrawerProps) {
  const { t } = useTranslation('common');
  const [shouldRender, setShouldRender] = useState(open);
  const onOpenRef = useRef(onOpen);
  const sizeClass =
    size === 'wide'
      ? 'md:w-[70vw] lg:w-[56vw] xl:w-[50vw]'
      : size === 'compact'
        ? 'md:w-[70vw] lg:w-[40vw] xl:w-[36vw]'
        : 'md:w-[70vw] lg:w-[46vw] xl:w-[42vw]';

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      onOpenRef.current?.();
      return;
    }

    const timeout = window.setTimeout(() => setShouldRender(false), 320);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  const drawerState = open ? 'open' : 'closed';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t('actions.close')}
        className="app-drawer-overlay absolute inset-0 bg-brand-900/40"
        data-state={drawerState}
        onClick={onClose}
      />

      <aside
        role={role}
        aria-modal="true"
        aria-label={title}
        data-state={drawerState}
        className={`app-drawer-panel relative z-10 flex h-full w-full flex-col bg-white shadow-2xl ${sizeClass}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-brand-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-200 bg-brand-50 p-2 text-slate-600 hover:bg-brand-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {isLoading ? (
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm font-medium text-slate-700">
              {loadingLabel}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                {typeof error === 'string' ? error : 'Could not load this drawer.'}
              </p>
              {typeof error === 'string' ? null : <div className="mt-2 text-sm text-red-700">{error}</div>}
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : (
            children
          )}
        </div>

        {footer ? (
          <footer className={`border-t border-brand-100 ${footerClassName}`}>{footer}</footer>
        ) : null}
      </aside>
    </div>
  );
}

export function Drawer(props: DrawerProps) {
  return <AppDrawer {...props} />;
}
