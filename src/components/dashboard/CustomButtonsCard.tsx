import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Sparkles, ChevronRight } from 'lucide-react';
import { TrackerIcon } from '../common/TrackerIcon';

// Single consolidated card for all user-defined custom trackers (below poop),
// styled like the Water/Poop cards. The + button opens the tracker directly
// when there is only one, otherwise the picker.
export const CustomButtonsCard: React.FC = () => {
  const {
    settings,
    currentDayLog,
    setCustomButtonOpenId,
    setIsCustomPickerOpen,
    t,
  } = useApp();

  if (!settings.customButtons.length) return null;

  const openAdd = () => {
    if (settings.customButtons.length === 1) {
      setCustomButtonOpenId(settings.customButtons[0].id);
    } else {
      setIsCustomPickerOpen(true);
    }
  };

  const loggedCount = settings.customButtons.filter((b) => {
    const v = currentDayLog.custom?.[b.id];
    return v === true || (typeof v === 'number' && v > 0);
  }).length;

  return (
    <div className="bg-[#E2D6FF] rounded-3xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0E9FF] text-[#4D3582] flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="text-sm font-extrabold text-[#4D3582] block">
              {t.quickAdd.custom}
            </span>
            <span className="text-xs font-medium text-[#6E5BA8]">
              {loggedCount}/{settings.customButtons.length} · {t.water.totalToday}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="w-9 h-9 rounded-full bg-[var(--surface)] hover:opacity-80 text-[#4D3582] flex items-center justify-center transition-colors"
          title={t.quickAdd.custom}
          aria-label={t.quickAdd.custom}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-1.5">
        {settings.customButtons.map((b) => {
          const val = currentDayLog.custom?.[b.id];
          const logged = val === true || (typeof val === 'number' && val > 0);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setCustomButtonOpenId(b.id)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F0E9FF] hover:bg-white/70 flex items-center justify-between gap-3 transition-colors text-left"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <TrackerIcon icon={b.icon} size={15} className="text-[#4D3582] shrink-0" />
                <span className="font-bold text-[#4D3582] text-xs sm:text-sm truncate">
                  {b.name}
                </span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-xs sm:text-sm font-extrabold ${
                    logged ? 'text-[#4D3582]' : 'text-[#6E5BA8]/60'
                  }`}
                >
                  {b.type === 'toggle'
                    ? val
                      ? `✓ ${t.settings.done}`
                      : t.settings.notDone
                    : typeof val === 'number'
                    ? `${val}${b.unit ? ' ' + b.unit : ''}`
                    : '—'}
                </span>
                <ChevronRight size={14} className="text-[#6E5BA8]" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
