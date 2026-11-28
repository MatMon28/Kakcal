import { useState } from 'react';
import { Check, Clock3, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { AmountStepper } from '../common/AmountStepper';
import { TrackerIcon } from '../common/TrackerIcon';
import { addDaysToDateString, dateFormatter, formatDateDisplay } from '../../utils/formatters';
import { formatTrackerAmount, getCustomEntries, getTrackerValue } from '../../utils/customTrackers';

const PRESET_AMOUNTS = [50, 100, 200, 400];

export function CustomButtonModal() {
  const {
    settings, currentDayLog, allDayLogs, selectedDate, language, logCustom, removeCustomEntry,
    customButtonOpenId, setCustomButtonOpenId, t,
  } = useApp();
  const def = settings.customButtons.find((tracker) => tracker.id === customButtonOpenId);
  const [qty, setQty] = useState(0);
  const [done, setDone] = useState(() => def ? getTrackerValue(currentDayLog, def) === true : false);
  if (!def) return null;

  const isQuantity = def.type === 'quantity';
  const dayValue = getTrackerValue(currentDayLog, def);
  const entries = isQuantity ? getCustomEntries(currentDayLog, def.id) : [];
  const formatQty = (amount: number) => `${formatTrackerAmount(amount, language)}${def.unit ? ` ${def.unit}` : ''}`;
  const formatTime = (timestamp: string) => dateFormatter(language === 'it' ? 'it-IT' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
  const canSave = !isQuantity || (Number.isFinite(qty) && qty > 0);
  const close = () => setCustomButtonOpenId(null);

  const history = Array.from({ length: 6 }, (_, i) => addDaysToDateString(selectedDate, -i - 1))
    .map((date) => ({ date, value: getTrackerValue(allDayLogs[date], def) }))
    .filter((day) => day.value !== undefined);

  return (
    <Modal dockId="custom" isOpen onClose={close} title={def.name} subtitle={formatDateDisplay(selectedDate, language)} maxWidth="max-w-md">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          logCustom(def.id, isQuantity ? qty : done);
          close();
        }}
      >
        <div className="kc-modal-banner bg-[#F7E9AA] rounded-2xl p-3.5 flex items-center justify-between gap-2 text-[#6E5B14]">
          <span className="flex items-center gap-2.5 text-sm font-extrabold">
            <span className="kc-custom-icon-badge size-9 rounded-full bg-[#FCF4D6] flex items-center justify-center shrink-0">
              <TrackerIcon icon={def.icon} size={17} />
            </span>
            {isQuantity ? t.tracker.total : formatDateDisplay(selectedDate, language)}
          </span>
          <span className="text-lg font-extrabold tabular-nums text-right" aria-live="polite">
            {isQuantity ? formatQty(typeof dayValue === 'number' ? dayValue : 0) : done ? t.settings.done : t.settings.notDone}
          </span>
        </div>

        {isQuantity ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--muted)]">{t.settings.typeQuantity}</p>
            <AmountStepper value={qty} onChange={setQty} unit={def.unit || ''} ariaLabel={t.settings.typeQuantity} />
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={qty === amount}
                  onClick={() => setQty(amount)}
                  className={`pressable min-h-9 px-1 py-1 rounded-xl text-xs font-extrabold tabular-nums border break-words ${
                    qty === amount
                      ? 'kc-chip-active bg-[#F7E9AA] text-[#6E5B14] border-[#E4D27E]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {formatQty(amount)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={done === value}
                onClick={() => setDone(value)}
                className={`pressable py-3 rounded-2xl text-sm font-extrabold border ${
                  done === value
                    ? value ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]' : 'kc-chip-active bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {value ? t.settings.done : t.settings.notDone}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="kc-primary-btn pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.settings.logCustom}{isQuantity && qty > 0 ? ` · ${formatQty(qty)}` : ''}</span>
        </button>

        {isQuantity && (
          <section aria-label={t.tracker.entries} className="border-t border-[var(--border)] pt-3 space-y-1.5">
            <h3 className="text-xs font-extrabold text-[var(--text)]">{t.tracker.entries}</h3>
            {!entries.length ? <p className="text-xs text-[var(--muted)]">{t.tracker.empty}</p> : (
              <ul className="space-y-1.5">
                {[...entries].reverse().map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--inset)] pl-3 pr-1.5 py-1">
                    <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-extrabold text-[var(--text)] tabular-nums">{formatQty(entry.amount)}</span>
                      <span className="text-xs text-[var(--muted)] inline-flex items-center gap-1">
                        {entry.timestamp ? <><Clock3 size={12} />{formatTime(entry.timestamp)}</> : t.tracker.earlierTotal}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomEntry(def.id, entry.id, selectedDate)}
                      aria-label={t.tracker.removeEntry.replace('{amount}', formatQty(entry.amount))}
                      className="kc-danger-icon-hover pressable size-9 rounded-full flex items-center justify-center shrink-0 text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section aria-label={t.tracker.pastTotals} className="bg-[var(--inset)] rounded-xl px-3 py-2.5 space-y-1.5">
            <h3 className="text-xs font-extrabold text-[var(--text)]">{t.tracker.pastTotals}</h3>
            {history.map(({ date, value }) => (
              <div key={date} className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                <span>{formatDateDisplay(date, language)}</span>
                <span className="text-[var(--text)] tabular-nums">{typeof value === 'number' ? formatQty(value) : value ? t.settings.done : t.settings.notDone}</span>
              </div>
            ))}
          </section>
        )}
      </form>
    </Modal>
  );
}
