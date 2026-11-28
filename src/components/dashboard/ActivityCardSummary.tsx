import React from 'react';
import { Activity, Flame, Footprints, Pencil, RefreshCw, Route, Trash2, Zap } from 'lucide-react';
import { useJournalData, useSettings, useUiActions } from '../../context/AppContext';
import { activityLogLabel } from '../../utils/activityLabel';
import { isAndroidApp } from '../../utils/android';
import { TrackerCard } from './TrackerCard';

interface Props {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

const pill = 'inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap';

export const ActivityCardSummary: React.FC<Props> = ({ compact = false, open, onToggle }) => {
  const { currentDayLog, currentExpenditure, removeActivity, syncHealthConnect, isHealthConnectSyncing } = useJournalData();
  const { settings, language, t } = useSettings();
  const { setIsLogActivityOpen, setEditingActivity } = useUiActions();

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
      : String(activities.length);

  // Collapsed: one line only — in ultra minimal, route icon + distance number (matching reference).
  const summary = ultraMinimal ? (
    activities.length > 0 ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 bg-[var(--inset)] text-[var(--text)] text-[11px] font-extrabold leading-none">
        <Route size={12} strokeWidth={2.4} className="shrink-0" />
        <span className="tabular-nums">{distanceValue}</span>
      </span>
    ) : null
  ) : latest ? (
    <span className={`${pill} bg-[var(--inset)] text-[var(--text)] max-w-full`}>
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${pill} bg-[var(--inset)] text-[var(--muted)] gap-1`} aria-label={`${t.energy.bmrShort}: ${currentExpenditure.bmr}`} title={t.energy.bmrShort}>
            {ultraMinimal ? <><Flame size={11} aria-hidden="true" /><span className="sr-only">{t.energy.bmrShort}</span> {currentExpenditure.bmr}</> : `${t.energy.bmrShort} ${currentExpenditure.bmr}`}
          </span>
          <span className={`${pill} bg-[var(--inset)] text-[var(--text)] gap-1`} aria-label={`${t.energy.activitiesShort}: ${currentExpenditure.activityExpenditure}`} title={t.energy.activitiesShort}>
            {ultraMinimal ? <><Footprints size={11} aria-hidden="true" /><span className="sr-only">{t.energy.activitiesShort}</span> {currentExpenditure.activityExpenditure}</> : `${t.energy.activitiesShort} ${currentExpenditure.activityExpenditure}`}
          </span>
          <span className={`${pill} bg-[var(--inset)] text-[var(--muted)] gap-1`} aria-label={`${t.energy.tefShort}: ${currentExpenditure.tef}`} title={t.energy.tefShort}>
            {ultraMinimal ? <><Zap size={11} aria-hidden="true" /><span className="sr-only">{t.energy.tefShort}</span> {currentExpenditure.tef}</> : `${t.energy.tefShort} ${currentExpenditure.tef}`}
          </span>
          {settings.healthConnectSyncEnabled && isAndroidApp() && (
            <button
              type="button"
              onClick={() => void syncHealthConnect({ manual: true })}
              disabled={isHealthConnectSyncing}
              className={`${pill} ml-auto bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] gap-1 pressable disabled:opacity-50`}
              title={isHealthConnectSyncing ? t.activities.syncing : t.activities.syncNow}
              aria-label={isHealthConnectSyncing ? t.activities.syncing : t.activities.syncNow}
            >
              <RefreshCw size={11} className={isHealthConnectSyncing ? 'animate-spin' : ''} aria-hidden="true" />
              {!ultraMinimal && <span>{isHealthConnectSyncing ? t.activities.syncing : t.activities.syncNow}</span>}
            </button>
          )}
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
              const stepText =
                act.steps && act.steps > 0
                  ? `${act.steps.toLocaleString(language === 'it' ? 'it-IT' : 'en-US')} ${t.activities.steps}`
                  : '';
              const distText = act.distanceKm !== undefined && act.distanceKm > 0 ? `${act.distanceKm} ${t.activities.km}` : '';
              const durText = act.durationMin !== undefined && act.durationMin > 0 ? `${act.durationMin} ${t.activities.min}` : '';
              const detail = [stepText, distText, durText, act.notes].filter(Boolean).join(' · ');
              return (
                <div key={act.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--text)]">
                      <span className="truncate">{name(act)}</span>
                      {act.source === 'health_connect' && (
                        <span
                          className="shrink-0 inline-flex text-[var(--muted)]"
                          aria-label={t.activities.syncedBadge}
                          title={t.activities.syncedBadge}
                        >
                          <Activity size={11} aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    {!ultraMinimal && detail && (
                      <span className="block text-[11px] font-medium tabular-nums text-[var(--muted)] truncate">
                        {detail}
                      </span>
                    )}
                    {ultraMinimal && act.steps && act.steps > 0 && (
                      <span className="block text-[11px] font-medium tabular-nums text-[var(--muted)] truncate">
                        {act.steps.toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}
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
                    onClick={() => setEditingActivity({ date: currentDayLog.date, activity: act })}
                    className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center shrink-0"
                    title={t.activities.editActivity}
                    aria-label={`${t.activities.editActivity}: ${name(act)}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeActivity(act.id)}
                    className="kc-danger-icon-hover pressable size-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
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
