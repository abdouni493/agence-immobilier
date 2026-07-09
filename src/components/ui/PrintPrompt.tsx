import type { ReactNode } from 'react';
import { Printer, X } from 'lucide-react';
import { Modal } from './Modal';
import { GradientButton } from './GradientButton';
import { useI18n } from '@/i18n';

/** A friendly "voulez-vous imprimer ?" prompt shown after a record or a
 *  payment is saved. Unlike ConfirmDialog it is not styled as a destructive
 *  warning — it invites the user to print rather than alarming them. */
export function PrintPrompt({
  open, onClose, onConfirm, title, message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  message?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="text-center py-2">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-grad-primary shadow-glow">
          <Printer className="text-white" size={26} />
        </div>
        <h3 className="text-lg font-bold text-ink-primary">{title ?? t('common.print')}</h3>
        {message && <p className="mt-1.5 text-sm text-ink-secondary">{message}</p>}
        <div className="mt-6 flex gap-3">
          <GradientButton variant="glass" fullWidth icon={<X size={16} />} onClick={onClose}>
            {t('common.no')}
          </GradientButton>
          <GradientButton
            fullWidth
            icon={<Printer size={16} />}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {t('common.print')}
          </GradientButton>
        </div>
      </div>
    </Modal>
  );
}
