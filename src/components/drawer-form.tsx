import { FormEventHandler, PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDrawer, DrawerProps } from './drawer';

export interface DrawerFormProps extends Omit<DrawerProps, 'footer' | 'onClose'> {
  formId?: string;
  formClassName?: string;
  isLoading?: boolean;
  onClose?: () => void;
  onCancel: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  cancelLabel?: string;
  showActions?: boolean;
  actions?: ReactNode;
}

export function DrawerForm({
  open,
  title,
  description,
  formId = 'drawer-form',
  formClassName = 'grid gap-4',
  onClose,
  onCancel,
  onSubmit,
  isLoading = false,
  submitLabel,
  cancelLabel,
  showActions = true,
  actions,
  children,
}: PropsWithChildren<DrawerFormProps>) {
  const { t } = useTranslation('common');

  const defaultActions = (
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
        type="submit"
        form={formId}
        disabled={isLoading}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {isLoading ? 'Saving...' : submitLabel || t('actions.save')}
      </button>
    </div>
  );

  const footer = showActions ? (actions !== undefined ? actions : defaultActions) : undefined;

  return (
    <AppDrawer
      open={open}
      title={title}
      description={description}
      onClose={onClose ?? onCancel}
      footer={footer}
    >
      <form id={formId} className={formClassName} onSubmit={onSubmit}>
        {children}
      </form>
    </AppDrawer>
  );
}
