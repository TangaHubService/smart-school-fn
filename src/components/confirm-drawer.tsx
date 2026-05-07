import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { AppDrawer } from './drawer';

export interface ConfirmDrawerProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDrawer({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}: ConfirmDrawerProps) {
  const { t } = useTranslation('common');

  return (
    <AppDrawer
      open={open}
      title={title}
      description={message}
      onClose={onCancel}
      size="compact"
      role="alertdialog"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            {cancelLabel || t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {isLoading ? 'Loading...' : confirmLabel || t('actions.confirm')}
          </button>
        </div>
      }
    >
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-700">{message}</p>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
}
