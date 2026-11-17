import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2 } from 'lucide-react';

export const ActivityCardSummary: React.FC = () => {
  const {
    currentDayLog,
    currentExpenditure,
    removeActivity,
    setIsLogActivityOpen,
    t,
  } = useApp();

  const activities = currentDayLog.activities;

  return (
    <div className="bg-[#E2D6FF] rounded-3xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-[#4D3582]">
            {t.activities.title}
          </h4>
          <p className="text-xs font-medium text-[#6E5BA8] mt-0.5">
            {t.energy.bmrShort} {currentExpenditure.bmr} · {t.energy.activitiesShort} {currentExpenditure.activityExpenditure} · {t.energy.tefShort} {currentExpenditure.tef}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLogActivityOpen(true)}
          className="w-8 h-8 rounded-full bg-[#FBF8F2] hover:bg-white text-[#4D3582] flex items-center justify-center transition-colors"
          title={t.activities.logActivity}
          aria-label={t.activities.logActivity}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((act) => (
            <div
              key={act.id}
              className="px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] flex items-center justify-between gap-3"
            >
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-[#4D3582]">
                  {act.type === 'custom' ? (act.customName || t.activities.custom) : act.type === 'walking' ? t.activities.walking : t.activities.running}
                </span>
                <span className="text-[#6E5BA8] ml-2 font-medium">
                  {act.method === 'distance' && act.distanceKm !== undefined
                    ? `${act.distanceKm} km`
                    : act.durationMin !== undefined ? ` min` : ""}
                  {act.notes ? ` · ${act.notes}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs sm:text-sm font-extrabold text-[#4D3582]">
                  -{act.caloriesBurned}
                </span>
                <button
                  onClick={() => removeActivity(act.id)}
                  className="w-6 h-6 rounded-full text-[#6E5BA8] hover:text-[#8C2D32] flex items-center justify-center transition-colors"
                  title={t.common.delete}
                  aria-label={t.common.delete}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
