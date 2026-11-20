import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { deleteAllData } from '../../utils/deleteAllData';
import { ConfirmDialog } from './ConfirmDialog';

/** Settings card that erases every local record after two separate confirmations. */
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
    <section aria-label={copy.title} className="bg-[#F6D0D0]/40 border border-[#E9A9A9]/60 rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{copy.title}</h3>
      <p className="text-[11px] font-medium text-[var(--muted)]">{copy.desc}</p>
      <button
        type="button"
        onClick={() => setStep(1)}
        className="pressable w-full py-2.5 px-3 rounded-xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] font-extrabold text-xs flex items-center justify-center gap-1.5"
      >
        <Trash2 size={15} />
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
    </section>
  );
};
