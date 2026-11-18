import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  /** Half-width variant used by the compact Today arrangement. */
  compact?: boolean;
}

export const ActivityCardSummary: React.FC<Props> = ({ compact = false }) => {
  const {
    currentDayLog,
    currentExpenditure,
    removeActivity,
    setIsLogActivityOpen,
    t,
  } = useApp();

  const activities = currentDayLog.activities;
  const firstActivity = activities[0];
  const activityName = (act: (typeof activities)[number]) =>
    act.type === 'custom'
      ? act.customName || t.activities.custom
      : act.type === 'walking'
      ? t.activities.walking
      : t.activities.running;

  if (compact) {
    return (
      <div className="bg-[#E2D6FF] rounded-2xl p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[13px] font-extrabold text-[#4D3582] truncate">{t.activities.title}</h4>
          <button
            type="button"
            onClick={() => setIsLogActivityOpen(true)}
            className="pressable size-7 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#4D3582] flex items-center justify-center"
            title={t.activities.logActivity}
            aria-label={t.activities.logActivity}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>

        <p className="text-lg sm:text-xl font-extrabold leading-none tabular-nums text-[#4D3582]">
          -{currentExpenditure.activityExpenditure}
          <span className="text-[11px] font-bold ml-1">kcal</span>
        </p>
        <p className="text-[11px] font-medium tabular-nums text-[#6E5BA8] truncate">
          {t.energy.bmrShort} {currentExpenditure.bmr} · {activities.length}×
        </p>

        {firstActivity && (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#F0E9FF] px-2 py-1.5">
            <span className="min-w-0 flex-1 text-[11px] font-bold text-[#4D3582] truncate">
              {activityName(firstActivity)}
              {activities.length > 1 && ` +${activities.length - 1}`}
            </span>
            <button
              type="button"
              onClick={() => removeActivity(firstActivity.id)}
              className="pressable size-6 shrink-0 rounded-full text-[#6E5BA8] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
              title={t.common.delete}
              aria-label={`${t.common.delete}: ${activityName(firstActivity)}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-[#4D3582]">
            {t.activities.title}
          </h4>
          <p className="text-xs font-medium tabular-nums text-[#6E5BA8] mt-0.5">
            {t.energy.bmrShort} {currentExpenditure.bmr} · {t.energy.activitiesShort} {currentExpenditure.activityExpenditure} · {t.energy.tefShort} {currentExpenditure.tef}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLogActivityOpen(true)}
          className="pressable w-9 h-9 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#4D3582] flex items-center justify-center"
          title={t.activities.logActivity}
          aria-label={t.activities.logActivity}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((act) => {
            const detail =
              act.method === 'distance' && act.distanceKm !== undefined
                ? `${act.distanceKm} ${t.activities.km}`
                : act.durationMin !== undefined
                ? `${act.durationMin} ${t.activities.min}`
                : '';

            return (
              <div
                key={act.id}
                className="px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] flex items-center justify-between gap-3"
              >
                <div className="text-xs sm:text-sm min-w-0">
                  <span className="font-bold text-[#4D3582]">{activityName(act)}</span>
                  {(detail || act.notes) && (
                    <span className="text-[#6E5BA8] ml-2 font-medium tabular-nums">
                      {detail}
                      {detail && act.notes ? ' · ' : ''}
                      {act.notes || ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[#4D3582]">
                    -{act.caloriesBurned} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => removeActivity(act.id)}
                    className="pressable w-8 h-8 rounded-full text-[#6E5BA8] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
