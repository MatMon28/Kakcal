import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { useFastingText } from '../../i18n/fasting';
import { formatDateDisplay } from '../../utils/formatters';
import { formatDurationCompact, type FastingDayBar, type HungerHourPoint } from '../../utils/fastingStore';

export const FastingDaysBarChart: React.FC<{
  bars: FastingDayBar[];
  avgDurationMs: number;
  totalHours: number;
  targetHours: number;
  ultra: boolean;
}> = ({ bars, avgDurationMs, totalHours, targetHours, ultra }) => {
  const { language } = useSettings();
  const ft = useFastingText();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedBar = bars.find((b) => b.date === selectedDate) ?? null;
  const maxHours = Math.max(targetHours * 1.15, ...bars.map((b) => b.hours), 1);
  const daysOnTarget = bars.filter((b) => b.onTarget).length;
  const targetPct = Math.min(100, (targetHours / maxHours) * 100);

  return (
    <section
      aria-label={ft.stats.fastingTimeTitle}
      data-kc-tone="planner"
      className={`rounded-3xl border border-[var(--border)] bg-[#CFE7FE] text-[#183F66] ${ultra ? 'p-3.5' : 'p-4 sm:p-5'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Timer size={15} data-kc-tone-ink aria-hidden="true" />
          <h3 data-kc-tone-ink className="text-sm font-extrabold">{ft.stats.fastingTimeTitle}</h3>
        </div>
        <div className="text-right tabular-nums">
          <div className="text-sm font-extrabold">
            {ft.stats.perDay.replace('{time}', formatDurationCompact(avgDurationMs))}
          </div>
          {!ultra && (
            <div className="text-[11px] font-bold opacity-80">
              {ft.stats.onTargetSummary
                .replace('{hours}', String(totalHours))
                .replace('{done}', String(daysOnTarget))
                .replace('{total}', String(bars.length))}
            </div>
          )}
        </div>
      </div>

      <div className="kc-fast-subbox mt-2.5 flex items-center justify-between gap-2 rounded-full bg-[#FBF8F2]/55 px-3 py-1 text-[11px] font-extrabold tabular-nums">
        <span>
          {selectedBar
            ? `${formatDateDisplay(selectedBar.date, language)} · ${selectedBar.hours}h (${selectedBar.fastCount})`
            : ft.stats.tapDayHint}
        </span>
        <span className="opacity-80">{ft.stats.targetLabel.replace('{hours}', String(targetHours))}</span>
      </div>

      <div className="relative mt-4 h-28 flex items-end gap-1 sm:gap-1.5 px-1">
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-current opacity-35"
          style={{ bottom: `${targetPct}%` }}
        />
        {bars.map((bar) => {
          const hPct = bar.hours > 0 ? Math.max(8, Math.min(100, (bar.hours / maxHours) * 100)) : 3;
          const active = selectedDate === bar.date;
          const dayChar = new Date(`${bar.date}T12:00:00`).toLocaleDateString(
            language === 'it' ? 'it-IT' : 'en-US',
            { weekday: 'narrow' },
          );
          return (
            <button
              key={bar.date}
              type="button"
              onClick={() => setSelectedDate((prev) => (prev === bar.date ? null : bar.date))}
              aria-label={`${formatDateDisplay(bar.date, language)}: ${bar.hours}h`}
              className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1 group"
            >
              <span className="w-full flex-1 flex items-end justify-center">
                <span
                  className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                    bar.hours === 0
                      ? 'bg-current opacity-15 rounded-full'
                      : bar.onTarget
                      ? 'kc-fast-bar bg-[#2B6CB0] opacity-95'
                      : 'kc-fast-bar bg-[#2B6CB0] opacity-55'
                  } ${active ? 'ring-2 ring-current' : ''}`}
                  style={{ height: `${hPct}%` }}
                />
              </span>
              {bars.length <= 14 && (
                <span className="text-[10px] font-extrabold opacity-75 leading-none">{dayChar}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const FastingHungerChart: React.FC<{
  points: HungerHourPoint[];
  ultra: boolean;
}> = ({ points, ultra }) => {
  const ft = useFastingText();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const selected = points.find((p) => p.hour === selectedHour) ?? null;
  const W = 300;
  const H = 128;
  const PAD_L = 24;
  const PAD_R = 14;
  const PAD_T = 14;
  const PAD_B = 22;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const minHr = points.length ? Math.min(0, points[0].hour) : 0;
  const maxHr = points.length ? Math.max(16, points[points.length - 1].hour) : 16;
  const span = Math.max(1, maxHr - minHr);

  const coords = points.map((pt) => ({
    ...pt,
    x: PAD_L + ((pt.hour - minHr) / span) * plotW,
    y: PAD_T + (1 - (pt.avgHunger - 1) / 4) * plotH,
  }));
  const poly = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <section
      aria-label={ft.stats.hungerTitle}
      data-kc-tone="recipes"
      className={`rounded-3xl border border-[var(--border)] bg-[#E2D6FF] text-[#49346F] ${ultra ? 'p-3.5' : 'p-4 sm:p-5'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 data-kc-tone-ink className="text-sm font-extrabold">{ft.stats.hungerTitle}</h3>
          {!ultra && <p className="text-[11px] font-bold opacity-80">{ft.stats.hungerSubtitle}</p>}
        </div>
        <span className="kc-fast-subbox rounded-full bg-[#FBF8F2]/80 text-[#49346F] px-2.5 py-1 text-[11px] font-extrabold tabular-nums shrink-0">
          {selected
            ? `${ft.stats.hrLabel.replace('{hour}', String(selected.hour))} · ${selected.avgHunger}/5 (${ft.stats.samples.replace('{count}', String(selected.count))})`
            : ft.stats.tapPoint}
        </span>
      </div>

      {coords.length === 0 ? (
        <p className="py-6 text-center text-xs font-bold opacity-75">{ft.stats.noHungerData}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 mt-2 overflow-visible">
          {[1, 2, 3, 4, 5].map((lv) => {
            const y = PAD_T + (1 - (lv - 1) / 4) * plotH;
            return (
              <g key={lv}>
                <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="3 3" />
                <text x={6} y={y + 3} fontSize="10" fontWeight="700" fill="currentColor" opacity={0.7}>{lv}</text>
              </g>
            );
          })}
          {coords.length > 1 && (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={poly}
            />
          )}
          {coords.map((c) => {
            const isSel = c.hour === selectedHour;
            return (
              <g key={c.hour}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSel ? 6 : 4.5}
                  fill="currentColor"
                  stroke="var(--surface)"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={() => setSelectedHour((prev) => (prev === c.hour ? null : c.hour))}
                />
              </g>
            );
          })}
          {[minHr, Math.round((minHr + maxHr) / 2), maxHr].map((hr) => {
            const x = PAD_L + ((hr - minHr) / span) * plotW;
            return (
              <text key={hr} x={x} y={H - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" opacity={0.7}>
                {hr}h
              </text>
            );
          })}
        </svg>
      )}
    </section>
  );
};
