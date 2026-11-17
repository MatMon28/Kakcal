import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountStepper } from '../common/AmountStepper';
import { addDaysToDateString, formatDateDisplay } from '../../utils/formatters';
import { Check } from 'lucide-react';
import { TrackerIcon } from '../common/TrackerIcon';

export const CustomButtonModal: React.FC = () => {
  const {
    settings,
    currentDayLog,
    allDayLogs,
    selectedDate,
    language,
    logCustom,
    customButtonOpenId,
    setCustomButtonOpenId,
    t,
  } = useApp();
  const def = settings.customButtons.find((b) => b.id === customButtonOpenId) || null;

  const [qty, setQty] = useState<number>(100);
  const [done, setDone] = useState<boolean>(false);

  const isOpen = Boolean(def);

  useEffect(() => {
    if (def) {
      const cur = currentDayLog.custom?.[def.id];
      if (def.type === 'toggle') setDone(Boolean(cur));
      else setQty(typeof cur === 'number' && cur > 0 ? cur : 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customButtonOpenId]);

  if (!def) return null;

  const close = () => setCustomButtonOpenId(null);

  const handleSave = () => {
    if (def.type === 'toggle') logCustom(def.id, done);
    else if (qty > 0) logCustom(def.id, qty);
    close();
  };

  // last 7 days history for this tracker (like water/poop lists)
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysToDateString(selectedDate, -i);
    return { date: d, value: allDayLogs[d]?.custom?.[def.id] };
  }).filter((h) => h.value !== undefined && h.value !== false && h.value !== 0);

  const quickQtys = [50, 100, 200, 400];

  return (
    <Modal isOpen={isOpen} onClose={close} title={def.name} maxWidth="max-w-sm">
      <div className="space-y-4">
        {/* header summary, like water/poop cards */}
        <div className="bg-[#E2D6FF] rounded-2xl p-3.5 flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#4D3582]">
            <span className="w-9 h-9 rounded-full bg-[#F0E9FF] flex items-center justify-center">
              <TrackerIcon icon={def.icon} size={17} />
            </span>
            {t.water.totalToday}
          </span>
          <span className="text-lg font-extrabold text-[#4D3582]">
            {def.type === 'toggle'
              ? done
                ? t.settings.done
                : t.settings.notDone
              : `${qty}${def.unit ? ' ' + def.unit : ''}`}
          </span>
        </div>

        {def.type === 'toggle' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDone(false)}
              className={`py-4 rounded-2xl text-sm font-extrabold border transition-colors ${
                !done
                  ? 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                  : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              {t.settings.notDone}
            </button>
            <button
              type="button"
              onClick={() => setDone(true)}
              className={`py-4 rounded-2xl text-sm font-extrabold border transition-colors ${
                done
                  ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                  : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              {t.settings.done}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {quickQtys.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQty(q)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-colors ${
                    qty === q
                      ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {q}
                  {def.unit ? ` ${def.unit}` : ''}
                </button>
              ))}
            </div>
            <AmountStepper value={qty} onChange={setQty} unit={def.unit || ''} />
          </div>
        )}

        {/* recent history */}
        {history.length > 0 && (
          <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-1">
            {history.slice(0, 5).map((h) => (
              <div
                key={h.date}
                className="flex items-center justify-between text-xs font-bold text-[var(--muted)]"
              >
                <span>{formatDateDisplay(h.date, language)}</span>
                <span className="text-[var(--text)]">
                  {typeof h.value === 'boolean'
                    ? h.value
                      ? `✓ ${t.settings.done}`
                      : t.settings.notDone
                    : `${h.value}${def.unit ? ' ' + def.unit : ''}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>
            {t.settings.logCustom}
            {def.type === 'quantity' ? ` · ${qty}${def.unit ? ' ' + def.unit : ''}` : ''}
          </span>
        </button>
      </div>
    </Modal>
  );
};
