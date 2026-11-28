import { Sparkles, ChevronRight, Check, X } from 'lucide-react';
import { useJournalData, useSettings, useUiActions } from '../../context/AppContext';
import { TrackerIcon } from '../common/TrackerIcon';
import { formatTrackerAmount, getCustomEntries, getTrackerValue } from '../../utils/customTrackers';
import { TrackerCard } from './TrackerCard';

interface Props {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

export function CustomButtonsCard({ compact = false, open, onToggle }: Props) {
  const { settings, language, t } = useSettings();
  const { currentDayLog, logCustom } = useJournalData();
  const { setCustomButtonOpenId, setIsCustomPickerOpen } = useUiActions();
  if (!settings.customButtons.length) return null;

  const trackers = settings.customButtons.map((tracker) => ({ tracker, value: getTrackerValue(currentDayLog, tracker) }));
  const loggedCount = trackers.filter(({ value }) => value === true || typeof value === 'number').length;
  const openAdd = () =>
    settings.customButtons.length === 1 ? setCustomButtonOpenId(settings.customButtons[0].id) : setIsCustomPickerOpen(true);

  const headline = (
    <>
      <span className="font-extrabold">{loggedCount}</span>
      <span className="text-[12px] font-semibold text-[var(--muted)] opacity-80 ml-1">/ {trackers.length}</span>
    </>
  );

  // Collapsed: one lemon pill per logged tracker (name + value), truncated to the row.
  const logged = trackers.filter(({ value }) => value === true || typeof value === 'number');
  const summary = settings.ultraMinimal ? (
    logged.length === 0 ? null : (
      <div className="flex gap-1.5 min-w-0 overflow-hidden">
        {logged.map(({ tracker, value }) => (
          <span
            key={tracker.id}
            className="kc-custom-pill inline-flex items-center justify-center gap-1 rounded-lg px-2 min-h-6 py-1 bg-[#FCF4D6] text-[#6E5B14] text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap shrink-0 max-w-full"
          >
            <TrackerIcon icon={tracker.icon} size={11} className="shrink-0" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCustomButtonOpenId(tracker.id); }}
              aria-label={`${tracker.name}: ${typeof value === 'number' ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}` : t.settings.done}`}
              title={tracker.name}
              className="truncate min-h-6 px-0.5 text-left"
            >
              {typeof value === 'number' ? formatTrackerAmount(value, language) : <Check size={12} strokeWidth={3} />}
            </button>
          </span>
        ))}
      </div>
    )
  ) : logged.length === 0 ? (
      <span className="text-xs font-medium text-[var(--muted)] truncate">{t.tracker.empty}</span>
    ) : (
      <div className="flex gap-1.5 min-w-0 overflow-hidden">
        {logged.map(({ tracker, value }) => (
          <span
            key={tracker.id}
            className="kc-custom-pill inline-flex items-center gap-1 rounded-lg px-2 min-h-6 py-1 bg-[#FCF4D6] text-[#6E5B14] text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap shrink-0 max-w-full"
          >
            <TrackerIcon icon={tracker.icon} size={11} className="shrink-0" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCustomButtonOpenId(tracker.id); }}
              aria-label={`${tracker.name}: ${typeof value === 'number' ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}` : t.settings.done}`}
              className="truncate min-h-6 px-0.5 text-left"
            >
              {typeof value === 'number' ? `${formatTrackerAmount(value, language)}${tracker.unit ? ` ${tracker.unit}` : ''}` : tracker.name}
            </button>
          </span>
        ))}
      </div>
    );

  return (
    <TrackerCard
      title={t.quickAdd.custom}
      tone="custom"
      icon={settings.customButtons.length === 1 ? <TrackerIcon icon={settings.customButtons[0].icon} size={compact ? 15 : 16} /> : <Sparkles size={compact ? 15 : 16} strokeWidth={2.2} />}
      headline={headline}
      summary={summary}
      onAdd={openAdd}
      addLabel={t.settings.customPickerTitle}
      open={open}
      onToggle={onToggle}
      compact={compact}
    >
      <div className="divide-y divide-[var(--border)]">
        {trackers.map(({ tracker, value }) => {
          if (tracker.type === 'toggle') {
            return (
              <div key={tracker.id} className="py-2 flex items-center justify-between gap-2">
                <button type="button" onClick={() => setCustomButtonOpenId(tracker.id)} className="min-w-0 flex-1 text-left flex items-center gap-2">
                  <TrackerIcon icon={tracker.icon} size={14} className="text-[var(--muted)] shrink-0" />
                  <span className="font-bold text-[var(--text)] truncate text-xs sm:text-sm">{tracker.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => logCustom(tracker.id, value !== true)}
                  aria-pressed={value === true}
                  aria-label={`${tracker.name}: ${value === true ? t.settings.done : t.settings.notDone}`}
                  className={`pressable ${settings.ultraMinimal ? 'size-7 p-0 justify-center' : 'px-2.5 py-1'} rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 ${
                    value === true ? 'kc-action-pill bg-[#C9EFD3] text-[#174A2B]' : 'bg-[var(--inset)] text-[var(--muted)]'
                  }`}
                >
                  {settings.ultraMinimal ? (value === true ? <Check size={13} strokeWidth={2.5} /> : <X size={12} />) : (
                    <>
                      {value === true && <Check size={11} strokeWidth={2.5} />}
                      <span>{value === true ? t.settings.done : t.settings.notDone}</span>
                    </>
                  )}
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
              className="pressable w-full py-2 flex items-center gap-2 text-left"
            >
              <TrackerIcon icon={tracker.icon} size={14} className="text-[var(--muted)] shrink-0" />
              <span className="min-w-0 flex-1">
                  <span className="block font-bold text-xs sm:text-sm text-[var(--text)] truncate">{tracker.name}</span>
                  {!settings.ultraMinimal && count > 0 && (
                  <span className="block text-[11px] font-medium text-[var(--muted)]">
                    {count === 1 ? t.tracker.countOne : t.tracker.count.replace('{count}', String(count))}
                  </span>
                )}
              </span>
              <span className="kc-custom-pill shrink-0 rounded-lg px-2 py-1 bg-[#FCF4D6] text-[#6E5B14] text-[11px] font-extrabold tabular-nums leading-none">
                {typeof value === 'number' ? `${formatTrackerAmount(value, language)}${settings.ultraMinimal ? '' : tracker.unit ? ` ${tracker.unit}` : ''}` : '—'}
              </span>
              <ChevronRight size={14} className="shrink-0 text-[var(--muted)]" />
            </button>
          );
        })}
      </div>
    </TrackerCard>
  );
}
