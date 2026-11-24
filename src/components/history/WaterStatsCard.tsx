import React from 'react';
import { Droplets } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { formatDateDisplay } from '../../utils/formatters';

export interface WaterStatsDay {
  date: string;
  /** Water drunk that day, in ml. */
  ml: number;
  /** The daily water target for that day, in ml. */
  target: number;
}

/**
 * Statistics > Water: average per day over the selected range, total, how many days reached the daily target and
 * one bar per day (tap a bar to open that day). Same card pattern as the numeric custom trackers.
 */
export const WaterStatsCard: React.FC<{ days: WaterStatsDay[]; onInspect: (date: string) => void }> = ({ days, onInspect }) => {
  const { settings, language } = useApp();
  const j = useJournalText();
  const ultraMinimal = settings.ultraMinimal;
  const withWater = days.filter((day) => day.ml > 0);
  const total = withWater.reduce((sum, day) => sum + day.ml, 0);
  const average = withWater.length ? Math.round(total / withWater.length) : 0;
  const reached = days.filter((day) => day.target > 0 && day.ml >= day.target).length;
  const max = Math.max(1, ...days.map((day) => Math.max(day.ml, day.target)));
  const name = j('Water', 'Acqua');
  const perDay = j('/ day', '/ giorno');

  return (
    <div data-water-stats className={`kc-themed-card bg-[#CFE7FE] rounded-3xl ${ultraMinimal ? 'p-3' : 'p-4 sm:p-5'}`}>
      <div className="kc-custom-stat-header flex items-center justify-between gap-2 text-[#1A4670]">
        <span className="flex items-center gap-2 text-sm font-extrabold" aria-label={name} title={name}>
          <Droplets size={15} aria-hidden="true" />
          <span className={ultraMinimal ? 'sr-only' : ''}>{name}</span>
        </span>
        <span className="text-right tabular-nums">
          <span className="block text-sm font-extrabold" aria-label={`${name}: ${average} ml ${perDay}`}>
            {average} ml{!ultraMinimal && ` ${perDay}`}
          </span>
          {!ultraMinimal && (
            <span className="kc-custom-stat-sub block text-[11px] font-bold text-[#2E6A9F]">
              {(total / 1000).toFixed(1)} L · {j(`${reached}/${days.length} days on target`, `${reached}/${days.length} giorni a obiettivo`)}
            </span>
          )}
        </span>
      </div>
      <div className={`flex items-end gap-1 h-12 ${ultraMinimal ? 'mt-2 mb-1' : 'mt-3'}`}>
        {[...days].reverse().map((day) => {
          const height = day.ml > 0 ? Math.max(14, Math.round((day.ml / max) * 100)) : 10;
          const label = `${formatDateDisplay(day.date, language)} — ${day.ml > 0 ? `${day.ml} ml` : '—'}`;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onInspect(day.date)}
              title={label}
              aria-label={label}
              className={`flex-1 rounded-md transition-opacity hover:opacity-80 ${
                day.ml <= 0 ? 'kc-custom-stat-bar-empty bg-[#E8F3FF]/70' : day.target > 0 && day.ml >= day.target ? 'kc-custom-stat-bar-active bg-[#1E5E8F]' : 'kc-custom-stat-bar-active bg-[#2E7CC4]'
              }`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};
