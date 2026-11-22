import React from 'react';
import { Check } from 'lucide-react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';

interface SaveBeforeCloseDialogProps {
  open: boolean;
  /** Save what was entered, then close everything. */
  onSave: () => void;
  /** Close everything without saving. */
  onDiscard: () => void;
  /** Stay in the dialog that was about to close. */
  onKeepEditing: () => void;
  /** What would be lost, e.g. "3 foods". Optional. */
  detail?: string;
}

const TEXT = {
  en: {
    title: 'Save before closing?',
    message: 'You have items that are not saved to the meal yet.',
    save: 'Save',
    discard: "Don't save",
    keep: 'Keep editing',
  },
  it: {
    title: 'Salvare prima di chiudere?',
    message: 'Ci sono elementi non ancora salvati nel pasto.',
    save: 'Salva',
    discard: 'Non salvare',
    keep: 'Continua a modificare',
  },
} as const;

/**
 * Shown when a dialog that holds unsaved input is dismissed (tap outside, swipe down, X, Back): Save, Don't save or
 * Keep editing. Tapping outside this small dialog (or Back) counts as Keep editing, so nothing is lost by accident.
 */
export const SaveBeforeCloseDialog: React.FC<SaveBeforeCloseDialogProps> = ({ open, onSave, onDiscard, onKeepEditing, detail }) => {
  const { language } = useApp();
  const text = TEXT[language === 'it' ? 'it' : 'en'];
  return (
    <Modal isOpen={open} onClose={onKeepEditing} title={text.title} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">
          {text.message}
          {detail ? <span className="block mt-1 text-xs font-semibold text-[var(--muted)]">{detail}</span> : null}
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onSave}
            autoFocus
            className="pressable w-full min-h-11 px-3 py-2.5 rounded-2xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#17432A] text-sm font-extrabold inline-flex items-center justify-center gap-1.5"
          >
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            {text.save}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onKeepEditing}
              className="pressable min-h-11 px-2 py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold leading-tight"
            >
              {text.keep}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="pressable min-h-11 px-2 py-2.5 rounded-2xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] text-sm font-extrabold inline-flex items-center justify-center gap-1.5 leading-tight"
            >
              {text.discard}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
