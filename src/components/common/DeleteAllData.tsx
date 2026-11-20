import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { deleteAllData } from '../../utils/deleteAllData';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Last item of Settings: a muted red button as wide as the other Settings fields (no title, no description) that erases every local record after
 * two confirmations. It is deliberately quiet: a translucent red tint with red text, full width.
 */
export const DeleteAllData: React.FC = () => {
  const { t } = useApp();
  const copy = t.settings.deleteAll;
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);

  const erase = async () => {
    if (busy) return;
    setBusy(true);
    await deleteAllData();
    // A fresh start: nothing in memory can write the old journal back.
    window.location.reload();
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="pressable w-full min-h-[54px] py-2 px-3 rounded-xl bg-[#D93636]/10 hover:bg-[#D93636]/20 border border-[#D93636]/25 text-[#C94444] font-bold text-xs flex items-center justify-center gap-1.5"
      >
        <Trash2 size={13} className="shrink-0" />
        <span>{copy.button}</span>
      </button>

      <ConfirmDialog
        open={step === 1}
        title={copy.firstTitle}
        message={copy.firstMessage}
        confirmLabel={copy.firstConfirm}
        onCancel={() => setStep(0)}
        onConfirm={() => setStep(2)}
      />
      <ConfirmDialog
        open={step === 2}
        title={copy.finalTitle}
        message={copy.finalMessage}
        confirmLabel={copy.finalConfirm}
        onCancel={() => setStep(0)}
        onConfirm={() => void erase()}
      />
    </div>
  );
};
