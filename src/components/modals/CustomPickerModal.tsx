import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ChevronRight } from 'lucide-react';
import { TrackerIcon } from '../common/TrackerIcon';

// Shown when the single personalized quick-add button is pressed
// and several custom trackers exist: user picks which one to log.
export const CustomPickerModal: React.FC = () => {
  const {
    isCustomPickerOpen,
    setIsCustomPickerOpen,
    setCustomButtonOpenId,
    settings,
    currentDayLog,
    t,
  } = useApp();

  const close = () => setIsCustomPickerOpen(false);

  return (
    <Modal isOpen={isCustomPickerOpen} onClose={close} title={t.settings.customPickerTitle} maxWidth="max-w-sm">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">{t.settings.customPickerHint}</p>
        {settings.customButtons.map((b) => {
          const val = currentDayLog.custom?.[b.id];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                close();
                // open the chosen tracker right after the picker closes
                setTimeout(() => setCustomButtonOpenId(b.id), 60);
              }}
              className="w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--border)] rounded-2xl px-3 py-3 transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-full bg-[#E2D6FF] text-[#4D3582] flex items-center justify-center shrink-0">
                  <TrackerIcon icon={b.icon} size={16} />
                </span>
                <span className="text-left min-w-0">
                  <span className="block text-sm font-extrabold text-[var(--text)] truncate">
                    {b.name}
                  </span>
                  <span className="block text-[11px] font-bold text-[var(--muted)]">
                    {b.type === 'toggle'
                      ? val
                        ? t.settings.done
                        : t.settings.notDone
                      : typeof val === 'number'
                      ? `${val}${b.unit ? ' ' + b.unit : ''}`
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
