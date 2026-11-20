import React, { useMemo, useState } from 'react';
import type { BodyEntry } from '../../types/advanced';
import { diffDays } from '../../utils/formatters';

const W = 320;
const H = 120;
const PAD_X = 10;
const TOP = 16;
const BOTTOM = 104;

/**
 * Line chart of one body measure. The x axis is time (so gaps between measurements are visible),
 * the y axis fits the data of the period. Points are focusable; the selected one is read out by the parent.
 */
export const BodyChart: React.FC<{
  entries: BodyEntry[];
  from: string;
  to: string;
  label: (entry: BodyEntry) => string;
  selected: number;
  onSelect: (index: number) => void;
}> = ({ entries, from, to, label, selected, onSelect }) => {
  const [hover, setHover] = useState<number | null>(null);
  const geometry = useMemo(() => {
    const span = Math.max(1, diffDays(from, to));
    const values = entries.map((e) => e.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const middle = (min + max) / 2;
    // At least 2 units of vertical range so that a flat series is drawn in the middle, not stretched.
    const range = Math.max(max - min, 2);
    const x = (date: string) => (entries.length === 1 ? W / 2 : PAD_X + (diffDays(from, date) / span) * (W - PAD_X * 2));
    const y = (value: number) => (TOP + BOTTOM) / 2 - ((value - middle) / range) * (BOTTOM - TOP);
    return { x, y };
  }, [entries, from, to]);

  const active = hover ?? selected;
  const points = entries.map((e) => `${geometry.x(e.date)},${geometry.y(e.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 overflow-visible" role="group">
      {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map((yy) => (
        <line key={yy} x1={PAD_X} x2={W - PAD_X} y1={yy} y2={yy} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {entries.length > 1 && (
        <>
          <polyline points={points} fill="none" stroke="var(--color-weight)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <polyline points={points} fill="none" stroke="var(--weight-on-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {entries.map((entry, index) => {
        const cx = geometry.x(entry.date);
        const cy = geometry.y(entry.value);
        const isActive = active === index;
        return (
          <g
            key={entry.date}
            role="button"
            tabIndex={0}
            aria-label={label(entry)}
            aria-pressed={selected === index}
            className="cursor-pointer"
            onClick={() => onSelect(index)}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(index);
              }
            }}
          >
            <circle cx={cx} cy={cy} r="12" fill="transparent" />
            <circle cx={cx} cy={cy} r={isActive ? 5.5 : 4} fill="var(--color-weight)" stroke="var(--color-weight-ink)" strokeWidth={isActive ? 2.2 : 1.6} />
          </g>
        );
      })}
    </svg>
  );
};
