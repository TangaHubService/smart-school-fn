import { PropsWithChildren, ReactNode, useEffect } from 'react';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-brand-900/40"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-xl rounded-xl bg-white"
      >
        <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {description ? <p className="text-sm text-slate-700">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-semibold text-slate-700"
          >
            Close
          </button>
        </header>

        <div className="max-h-[70vh] overflow-auto px-4 py-4 sm:px-5">{children}</div>

        {footer ? <footer className="border-t border-brand-100 px-4 py-3 sm:px-5">{footer}</footer> : null}
      </section>
    </div>
  );
}
