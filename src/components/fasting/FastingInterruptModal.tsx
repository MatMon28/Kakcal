import React, { useSyncExternalStore } from 'react';
import { Modal } from '../common/Modal';
import { useFastingText } from '../../i18n/fasting';
import { computeFastTiming, endFast, formatDurationCompact, getFasting } from '../../utils/fastingStore';

interface PendingInterrupt {
  kcal: number;
  onConfirm: () => void;
}

let pending: PendingInterrupt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export function requestFastInterrupt(kcal: number, onConfirm: () => void) {
  pending = { kcal: Math.round(kcal), onConfirm };
  notify();
}

export function clearFastInterrupt() {
  if (!pending) return;
  pending = null;
  notify();
}

export const FastingInterruptModal: React.FC = () => {
  const ft = useFastingText();
  const current = useSyncExternalStore(subscribe, () => pending, () => null);
  const active = getFasting().activeSession;

  if (!current || !active) return null;

  const elapsed = formatDurationCompact(computeFastTiming(active).elapsedMs);
  const confirmLabel = current.kcal > 0
    ? ft.interrupt.confirm.replace('{kcal}', String(current.kcal))
    : ft.interrupt.confirmNoKcal;

  const handleConfirm = () => {
    const fn = current.onConfirm;
    clearFastInterrupt();
    endFast();
    fn();
  };

  return (
    <Modal isOpen={Boolean(current)} onClose={clearFastInterrupt} title={ft.interrupt.title} maxWidth="max-w-sm">
      <div className="space-y-3.5">
        <div data-kc-tone="diary" data-kc-tone-ink className="rounded-2xl bg-[#F7E9AA] text-[#5D4911] border border-[#E7D889] px-4 py-3 text-xs font-bold leading-relaxed">
          {ft.interrupt.body.replace('{elapsed}', elapsed)}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="kc-primary-btn pressable w-full py-3 rounded-2xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-sm font-extrabold"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={clearFastInterrupt}
            className="kc-fast-secondary-btn pressable w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-sm font-extrabold"
          >
            {ft.interrupt.keep}
          </button>
        </div>
      </div>
    </Modal>
  );
};
