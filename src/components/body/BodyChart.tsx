import React, { useMemo, useState } from 'react';
import type { BodyEntry } from '../../types/advanced';
import { diffDays } from '../../utils/formatters';

const W = 320;
const H = 120;
const PAD_X = 10;
const TOP = 16;
const BOTTOM = 104;

export interface ChartSeries {
  /** Series key, e.g. `left` / `right` (or `value` for a single measure). */
  id: string;
  entries: BodyEntry[];
  /** Second series of a left / right pair: dashed line and diamond markers (the first one is solid with circles). */
  alt?: boolean;
}

export interface ChartSelection {
  series: string;
  index: number;
}

/**
 * Line chart of one body measure: one series, or two (left and right side) sharing the same axes. The x axis is time
 * (so gaps between measurements are visible), the y axis fits the data of the period. Points are focusable; the
 * selected one is read out by the parent. The two sides differ by line style and marker shape, not only by colour, so
 * they stay distinguishable on every theme.
 */
export const BodyChart: React.FC<{
  series: ChartSeries[];
  from: string;
  to: string;
  label: (entry: BodyEntry, seriesId: string) => string;
  selected: ChartSelection | null;
  onSelect: (selection: ChartSelection) => void;
}> = ({ series, from, to, label, selected, onSelect }) => {
  const [hover, setHover] = useState<ChartSelection | null>(null);
  const total = series.reduce((sum, s) => sum + s.entries.length, 0);
  const geometry = useMemo(() => {
    const span = Math.max(1, diffDays(from, to));
    const values = series.flatMap((s) => s.entries.map((e) => e.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const middle = (min + max) / 2;
    // At least 2 units of vertical range so that a flat series is drawn in the middle, not stretched.
    const range = Math.max(max - min, 2);
    const x = (date: string) => (total === 1 ? W / 2 : PAD_X + (diffDays(from, date) / span) * (W - PAD_X * 2));
    const y = (value: number) => (TOP + BOTTOM) / 2 - ((value - middle) / range) * (BOTTOM - TOP);
    return { x, y };
  }, [series, from, to, total]);

  const active = hover ?? selected;
  const isActive = (id: string, index: number) => active?.series === id && active.index === index;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 overflow-visible" role="group">
      {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map((yy) => (
        <line key={yy} x1={PAD_X} x2={W - PAD_X} y1={yy} y2={yy} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {series.map((s) => {
        if (s.entries.length < 2) return null;
        const points = s.entries.map((e) => `${geometry.x(e.date)},${geometry.y(e.value)}`).join(' ');
        return (
          <g key={s.id} data-series={s.id}>
            {!s.alt && <polyline points={points} fill="none" stroke="var(--color-weight)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />}
            <polyline
              points={points}
              fill="none"
              stroke="var(--weight-on-surface)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.alt ? '7 5' : undefined}
            />
          </g>
        );
      })}
      {series.map((s) =>
        s.entries.map((entry, index) => {
          const cx = geometry.x(entry.date);
          const cy = geometry.y(entry.value);
          const on = isActive(s.id, index);
          const pick = () => onSelect({ series: s.id, index });
          const r = on ? 5.5 : 4;
          return (
            <g
              key={`${s.id}-${entry.date}`}
              role="button"
              tabIndex={0}
              aria-label={label(entry, s.id)}
              aria-pressed={selected?.series === s.id && selected.index === index}
              className="cursor-pointer"
              onClick={pick}
              onMouseEnter={() => setHover({ series: s.id, index })}
              onMouseLeave={() => setHover(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  pick();
                }
              }}
            >
              <circle cx={cx} cy={cy} r="12" fill="transparent" />
              {s.alt ? (
                <rect
                  x={cx - r * 0.8}
                  y={cy - r * 0.8}
                  width={r * 1.6}
                  height={r * 1.6}
                  transform={`rotate(45 ${cx} ${cy})`}
                  fill="var(--weight-on-surface)"
                  stroke="var(--color-weight)"
                  strokeWidth={on ? 2.2 : 1.6}
                />
              ) : (
                <circle cx={cx} cy={cy} r={r} fill="var(--color-weight)" stroke="var(--color-weight-ink)" strokeWidth={on ? 2.2 : 1.6} />
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
};
