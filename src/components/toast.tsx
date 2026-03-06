import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastInput {
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { ...input, id }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] grid w-[min(420px,calc(100vw-2rem))] gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const styleByType: Record<ToastType, string> = {
    success: 'border-success-100 bg-success-50 text-success-700',
    error: 'border-danger-100 bg-danger-50 text-danger-700',
    info: 'border-brand-200 bg-white text-slate-900',
  };

  return (
    <section
      role="status"
      aria-live="polite"
      className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-soft ${styleByType[toast.type]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{toast.title}</p>
          {toast.message ? <p className="mt-1 text-sm opacity-90">{toast.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-current/20 bg-white/70 px-2 py-1 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </section>
  );
}
