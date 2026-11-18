import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small "Are you sure?" dialog used before destructive actions (delete meal / recipe / food). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  message,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
}) => {
  const { t } = useApp();
  return (
    <Modal isOpen={open} onClose={onCancel} title={title ?? t.common.confirmTitle} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">{message}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="pressable py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="pressable py-2.5 rounded-2xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] text-sm font-extrabold inline-flex items-center justify-center gap-1.5"
          >
            <Trash2 size={15} />
            {confirmLabel ?? t.common.delete}
          </button>
        </div>
      </div>
    </Modal>
  );
};
