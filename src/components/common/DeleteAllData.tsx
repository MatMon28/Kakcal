import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { deleteAllData } from '../../utils/deleteAllData';
import { ConfirmDialog } from './ConfirmDialog';
import { scheduleRemoval } from '../../utils/undoRemoval';
import { useJournalText } from '../../i18n/journal';

/**
 * Last item of Settings: a muted red button as wide as the other Settings fields (no title, no description) that erases every local record after
 * two confirmations. It is deliberately quiet: a translucent red tint with red text, full width.
 */
export const DeleteAllData: React.FC = () => {
  const { t } = useApp();
  const j = useJournalText();
  const copy = t.settings.deleteAll;
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState(false);
  const erase = () => {
    if (busy) return;
    if (scheduleRemoval(() => {
      void deleteAllData().then(() => window.location.reload()).catch(() => { setError(true); setBusy(false); });
    }, () => setBusy(false))) {
      setStep(0);
      setBusy(true);
      setError(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setStep(1)}
        disabled={busy}
        className="pressable w-full min-h-[54px] py-2 px-3 rounded-xl bg-[color-mix(in_srgb,var(--text-warn)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--text-warn)_20%,transparent)] border border-[color-mix(in_srgb,var(--text-warn)_28%,transparent)] text-[var(--text-warn)] font-bold text-xs flex items-center justify-center gap-1.5"
      >
        <Trash2 size={13} className="shrink-0" />
        <span>{copy.button}</span>
      </button>

      {error && <p role="alert" className="text-xs text-[var(--text-warn)]">{j('Could not erase the data.', 'Impossibile eliminare i dati.')}</p>}
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
        message={j('All local data will be erased after a short window to cancel. Once erased it cannot be recovered.', 'Tutti i dati locali saranno eliminati dopo un breve intervallo per annullare. Dopo non potranno essere recuperati.')}
        confirmLabel={copy.finalConfirm}
        onCancel={() => setStep(0)}
        onConfirm={() => void erase()}
      />
    </div>
  );
};
