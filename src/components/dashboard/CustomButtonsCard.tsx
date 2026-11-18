import { Plus, Sparkles, ChevronRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TrackerIcon } from '../common/TrackerIcon';
import { formatTrackerAmount, getCustomEntries, getTrackerValue } from '../../utils/customTrackers';

interface Props {
  compact?: boolean;
}

export function CustomButtonsCard({ compact = false }: Props) {
  const {
    settings, currentDayLog, language, logCustom, setCustomButtonOpenId, setIsCustomPickerOpen, t,
  } = useApp();
  if (!settings.customButtons.length) return null;

  const trackers = settings.customButtons.map((tracker) => ({ tracker, value: getTrackerValue(currentDayLog, tracker) }));
  const loggedCount = trackers.filter(({ value }) => value === true || typeof value === 'number').length;
  const openAdd = () => settings.customButtons.length === 1
    ? setCustomButtonOpenId(settings.customButtons[0].id)
    : setIsCustomPickerOpen(true);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 min-w-0 text-[#6E5B14]">
        <Sparkles size={compact ? 14 : 16} className="shrink-0" />
        <span className={`${compact ? 'text-[13px]' : 'text-sm sm:text-base'} font-extrabold truncate`}>
          {t.quickAdd.custom}
        </span>
        {!compact && (
          <span className="text-xs font-medium tabular-nums text-[#8A7224] hidden sm:inline">
            {t.tracker.total}
          </span>
        )}
        <span className="text-xs font-medium tabular-nums text-[#8A7224]">
          {loggedCount}/{trackers.length}
        </span>
      </span>
      <button
        type="button"
        onClick={openAdd}
        className={`${compact ? 'size-7' : 'size-9'} shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#6E5B14] flex items-center justify-center`}
        title={t.settings.customPickerTitle}
        aria-label={t.settings.customPickerTitle}
      >
        <Plus size={compact ? 14 : 17} strokeWidth={2.5} />
      </button>
    </div>
  );

  const rows = (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {trackers.map(({ tracker, value }) => {
        if (tracker.type === 'toggle') {
          return (
            <div
              key={tracker.id}
              className={`${compact ? 'px-2 py-1.5 rounded-xl' : 'px-3.5 py-2.5 rounded-2xl'} bg-[#FCF4D6] flex items-center justify-between gap-2`}
            >
              <button
                type="button"
                onClick={() => setCustomButtonOpenId(tracker.id)}
                className="min-w-0 flex-1 text-left flex items-center gap-1.5"
              >
                <TrackerIcon icon={tracker.icon} size={14} className="text-[#6E5B14] shrink-0" />
                <span className="font-bold text-[#6E5B14] truncate text-xs">{tracker.name}</span>
              </button>
              <button
                type="button"
                onClick={() => logCustom(tracker.id, value !== true)}
                aria-pressed={value === true}
                aria-label={`${tracker.name}: ${value === true ? t.settings.done : t.settings.notDone}`}
                className={`pressable px-2 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 ${value === true ? 'bg-[#C9EFD3] text-[#174A2B]' : 'bg-[#FBF8F2] text-[#8A7224]'}`}
              >
                {value === true && <Check size={11} strokeWidth={2.5} />}
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
            className={`pressable w-full ${compact ? 'px-2 py-1.5 rounded-xl' : 'px-3.5 py-2.5 rounded-2xl'} bg-[#FCF4D6] hover:bg-[#FFF8E2] flex items-center gap-1.5 text-left text-[#6E5B14]`}
          >
            <TrackerIcon icon={tracker.icon} size={14} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-xs truncate">{tracker.name}</span>
              {!compact && count > 0 && (
                <span className="block text-[11px] font-semibold text-[#8A7224]">
                  {count === 1 ? t.tracker.countOne : t.tracker.count.replace('{count}', String(count))}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-extrabold tabular-nums">
              {typeof value === 'number'
                ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}`
                : '—'}
            </span>
            {!compact && <ChevronRight size={14} className="shrink-0 text-[#8A7224]" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <section
      aria-label={t.quickAdd.custom}
      className={`${compact ? 'bg-[#F7E9AA] rounded-2xl p-3 space-y-1.5' : 'bg-[#F7E9AA] rounded-3xl p-4 sm:p-5 space-y-2.5'}`}
    >
      {header}
      {rows}
    </section>
  );
}
