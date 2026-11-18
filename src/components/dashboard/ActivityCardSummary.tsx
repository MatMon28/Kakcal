import React from 'react';
import { Footprints, Route, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { activityLogLabel } from '../../utils/activityLabel';
import { TrackerCard } from './TrackerCard';

interface Props {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

const pill = 'inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap';

export const ActivityCardSummary: React.FC<Props> = ({ compact = false, open, onToggle }) => {
  const { currentDayLog, currentExpenditure, settings, removeActivity, setIsLogActivityOpen, language, t } = useApp();

  const activities = currentDayLog.activities;
  const ultraMinimal = settings.ultraMinimal;
  const name = (act: (typeof activities)[number]) => activityLogLabel(act, language, t.activities);
  const latest = activities[activities.length - 1];

  const headline = (
    <span aria-label={`${currentExpenditure.activityExpenditure} kcal`} title={`${currentExpenditure.activityExpenditure} kcal`}>
      {currentExpenditure.activityExpenditure}
      {!compact && <span className="text-[11px] font-semibold text-[var(--muted)] ml-1">kcal</span>}
    </span>
  );

  const totalKm = activities.reduce((sum, a) => sum + (a.distanceKm || 0), 0);
  const distanceValue =
    totalKm > 0
      ? (Math.round(totalKm * 10) / 10).toString()
      : latest?.distanceKm !== undefined
      ? latest.distanceKm.toString()
      : latest?.durationMin !== undefined
      ? (Math.round((latest.durationMin / 10) * 10) / 10).toString()
      : '3.5';

  // Collapsed: one line only — in ultra minimal, route icon + distance number (matching reference).
  const summary = ultraMinimal ? (
    activities.length > 0 ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 bg-[#F0E9FF] text-[#4D3582] text-[11px] font-extrabold leading-none">
        <Route size={12} strokeWidth={2.4} className="shrink-0" />
        <span className="tabular-nums">{distanceValue}</span>
      </span>
    ) : null
  ) : latest ? (
    <span className={`${pill} bg-[#F0E9FF] text-[#4D3582] max-w-full`}>
      <span className="truncate">{name(latest)}</span>
      {activities.length > 1 && <span className="ml-1 shrink-0">+{activities.length - 1}</span>}
    </span>
  ) : (
    <span className="text-xs font-medium text-[var(--muted)] truncate">{t.activities.noActivities}</span>
  );

  return (
    <TrackerCard
      title={t.activities.title}
      tone="activity"
      icon={<Footprints size={compact ? 15 : 16} strokeWidth={2.2} />}
      headline={headline}
      summary={summary}
      onAdd={() => setIsLogActivityOpen(true)}
      addLabel={t.activities.logActivity}
      open={open}
      onToggle={onToggle}
      compact={compact}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <span className={`${pill} bg-[var(--inset)] text-[var(--muted)]`} aria-label={`${t.energy.bmrShort}: ${currentExpenditure.bmr}`} title={t.energy.bmrShort}>
            {ultraMinimal ? currentExpenditure.bmr : `${t.energy.bmrShort} ${currentExpenditure.bmr}`}
          </span>
          <span className={`${pill} bg-[#F0E9FF] text-[#4D3582]`} aria-label={`${t.energy.activitiesShort}: ${currentExpenditure.activityExpenditure}`} title={t.energy.activitiesShort}>
            {ultraMinimal ? <><Footprints size={11} /> {currentExpenditure.activityExpenditure}</> : `${t.energy.activitiesShort} ${currentExpenditure.activityExpenditure}`}
          </span>
          <span className={`${pill} bg-[var(--inset)] text-[var(--muted)]`} aria-label={`${t.energy.tefShort}: ${currentExpenditure.tef}`} title={t.energy.tefShort}>
            {ultraMinimal ? currentExpenditure.tef : `${t.energy.tefShort} ${currentExpenditure.tef}`}
          </span>
        </div>

        {activities.length === 0 && ultraMinimal ? (
          <div className="min-h-7" aria-hidden="true" />
        ) : activities.length === 0 ? (
          <button
            type="button"
            onClick={() => setIsLogActivityOpen(true)}
            className="w-full py-1.5 flex items-center justify-between text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors text-left"
          >
            <span>{t.activities.noActivities}</span>
            <span className="font-bold">{t.activities.logActivity}</span>
          </button>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {activities.map((act) => {
              const detail =
                act.method === 'distance' && act.distanceKm !== undefined
                  ? `${act.distanceKm} ${t.activities.km}`
                  : act.durationMin !== undefined
                  ? `${act.durationMin} ${t.activities.min}`
                  : '';
              return (
                <div key={act.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className={`block text-xs sm:text-sm font-bold text-[var(--text)] truncate ${ultraMinimal ? 'sr-only' : ''}`}>{name(act)}</span>
                    {!ultraMinimal && (detail || act.notes) && (
                      <span className="block text-[11px] font-medium tabular-nums text-[var(--muted)] truncate">
                        {detail}
                        {detail && act.notes ? ' · ' : ''}
                        {act.notes || ''}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)] shrink-0"
                    aria-label={`${act.caloriesBurned} kcal`}
                    title={`${act.caloriesBurned} kcal`}
                  >
                    {act.caloriesBurned}{!compact && ' kcal'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeActivity(act.id)}
                    className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
                    title={t.common.delete}
                    aria-label={`${t.common.delete}: ${name(act)}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TrackerCard>
  );
};
