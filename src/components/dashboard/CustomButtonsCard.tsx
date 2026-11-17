import { Plus, Sparkles, ChevronRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TrackerIcon } from '../common/TrackerIcon';
import { formatTrackerAmount, getCustomEntries, getTrackerValue } from '../../utils/customTrackers';

export function CustomButtonsCard() {
  const {
    settings, currentDayLog, language, logCustom, setCustomButtonOpenId, setIsCustomPickerOpen, t,
  } = useApp();
  if (!settings.customButtons.length) return null;

  const trackers = settings.customButtons.map((tracker) => ({ tracker, value: getTrackerValue(currentDayLog, tracker) }));
  const loggedCount = trackers.filter(({ value }) => value === true || typeof value === 'number').length;
  const openAdd = () => settings.customButtons.length === 1
    ? setCustomButtonOpenId(settings.customButtons[0].id)
    : setIsCustomPickerOpen(true);

  return (
    <section aria-label={t.quickAdd.custom} className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-10 shrink-0 rounded-full bg-[#F0E9FF] text-[#4D3582] flex items-center justify-center">
            <Sparkles size={18} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#4D3582]">{t.quickAdd.custom}</h3>
            <p className="text-xs font-medium tabular-nums text-[#6E5BA8]">
              {t.tracker.total} · {loggedCount}/{trackers.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="pressable size-9 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#4D3582] flex items-center justify-center"
          aria-label={t.settings.customPickerTitle}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-1.5">
        {trackers.map(({ tracker, value }) => {
          if (tracker.type === 'toggle') {
            return (
              <div key={tracker.id} className="px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] flex items-center justify-between gap-2">
                <button type="button" onClick={() => setCustomButtonOpenId(tracker.id)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <TrackerIcon icon={tracker.icon} size={15} className="text-[#4D3582] shrink-0" />
                  <span className="font-bold text-[#4D3582] text-xs sm:text-sm truncate">{tracker.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => logCustom(tracker.id, value !== true)}
                  aria-pressed={value === true}
                  aria-label={`${tracker.name}: ${value === true ? t.settings.done : t.settings.notDone}`}
                  className={`pressable px-2.5 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 shrink-0 ${value === true ? 'bg-[#C9EFD3] text-[#174A2B]' : 'bg-[#FBF8F2] text-[#6E5BA8]'}`}
                >
                  {value === true && <Check size={12} strokeWidth={2.5} />}
                  <span>{value === true ? t.settings.done : t.settings.notDone}</span>
                </button>
              </div>
            );
          }

          const count = getCustomEntries(currentDayLog, tracker.id).length;
          return (
            <button
              key={tracker.id}
              type="button"
              onClick={() => setCustomButtonOpenId(tracker.id)}
              className="pressable w-full px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] hover:bg-[#F7F2FF] flex items-center gap-2.5 text-left text-[#4D3582]"
            >
              <TrackerIcon icon={tracker.icon} size={15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-xs sm:text-sm truncate">{tracker.name}</span>
                {count > 0 && (
                  <span className="block text-[11px] font-semibold text-[#6E5BA8]">
                    {count === 1 ? t.tracker.countOne : t.tracker.count.replace('{count}', String(count))}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs sm:text-sm font-extrabold tabular-nums">
                {typeof value === 'number' ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}` : '—'}
              </span>
              <ChevronRight size={14} className="shrink-0 text-[#6E5BA8]" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
