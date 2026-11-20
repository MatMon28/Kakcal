import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ChevronRight } from 'lucide-react';
import { TrackerIcon } from '../common/TrackerIcon';
import { formatTrackerAmount, getTrackerValue } from '../../utils/customTrackers';

// Shown when the single personalized quick-add button is pressed
// and several custom trackers exist: user picks which one to log.
export const CustomPickerModal: React.FC = () => {
  const {
    isCustomPickerOpen,
    setIsCustomPickerOpen,
    setCustomButtonOpenId,
    settings,
    currentDayLog,
    language,
    t,
  } = useApp();

  const close = () => setIsCustomPickerOpen(false);

  return (
    <Modal dockId="custom" isOpen={isCustomPickerOpen} onClose={close} title={t.settings.customPickerTitle} maxWidth="max-w-sm">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">{t.settings.customPickerHint}</p>
        {settings.customButtons.map((b) => {
          const val = getTrackerValue(currentDayLog, b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setIsCustomPickerOpen(false);
                setCustomButtonOpenId(b.id);
              }}
              className="pressable w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-3 text-left"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="kc-custom-icon-badge w-9 h-9 rounded-full bg-[#F7E9AA] text-[#6E5B14] flex items-center justify-center shrink-0">
                  <TrackerIcon icon={b.icon} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-[var(--text)] truncate">
                    {b.name}
                  </span>
                  <span className="block text-[11px] font-bold tabular-nums text-[var(--muted)]">
                    {b.type === 'toggle'
                      ? val
                        ? `✓ ${t.settings.done}`
                        : t.settings.notDone
                      : typeof val === 'number'
                      ? `${formatTrackerAmount(val, language)}${b.unit ? ' ' + b.unit : ''}`
                      : '—'}
                  </span>
                </span>
              </span>
              <ChevronRight size={16} className="text-[var(--muted)] shrink-0" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
