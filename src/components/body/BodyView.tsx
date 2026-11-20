import React, { useMemo, useState } from 'react';
import { CalendarDays, Ruler, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAdvancedText } from '../../i18n/advanced';
import { BODY_GROUPS, entriesInRange, groupOfMeasure, isDefaultMeasure, useBodyEntries } from '../../utils/advancedStore';
import type { BodyGroup } from '../../types/advanced';
import { formatDateDisplay, getTodayDateString } from '../../utils/formatters';
import { usePersistentState } from '../../utils/usePersistentState';
import { ActionDock, type DockAction } from '../common/ActionDock';
import { EditableGrid, type LayoutItem } from '../layout/EditableGrid';
import { LayoutToolbar, PencilRow } from '../layout/LayoutToolbar';
import { useLayoutText } from '../../i18n/layout';
import { useLayout } from '../../utils/layoutStore';
import { BodyPartIcon } from '../common/BodyPartIcon';
import { BodyChart } from './BodyChart';
import { BodyMeasureModal, useTrackedMeasures } from './BodyMeasureModal';

type RangeKey = '3m' | '6m' | '1y' | 'custom';

const MONTHS: Record<Exclude<RangeKey, 'custom'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

/** `date` moved back by whole months (clamped to the end of shorter months). */
function monthsAgo(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1 - months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

const GROUP_ICON: Record<BodyGroup, string> = { upper: 'chest', lower: 'thighs', custom: 'custom' };
const GROUP_TONE: Record<BodyGroup, string> = {
  upper: 'bg-[#CFE7FE] text-[#183F66]',
  lower: 'bg-[#FAE0B4] text-[#7D4E14]',
  custom: 'bg-[#E2D6FF] text-[#4D3582]',
};

/** One graph card. Own component so each card keeps its own selected point. */
const MeasureCard: React.FC<{ id: string; name: string; unit: string; from: string; to: string }> = ({ id, name, unit, from, to }) => {
  const { language, settings } = useApp();
  const text = useAdvancedText();
  const all = useBodyEntries()[id];
  const inRange = useMemo(() => entriesInRange(all, from, to), [all, from, to]);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && inRange[picked] ? picked : inRange.length - 1;
  const point = inRange[selected];
  const latest = all?.[all.length - 1];
  const delta = inRange.length >= 2 ? Math.round((inRange[inRange.length - 1].value - inRange[0].value) * 10) / 10 : 0;
  const ultra = settings.ultraMinimal;
  const label = (e: { date: string; value: number }) =>
    text.body.pointLabel.replace('{date}', formatDateDisplay(e.date, language)).replace('{value}', `${e.value} ${unit}`);

  return (
    <section aria-label={name} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5" data-measure={id}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="size-9 rounded-2xl bg-weight text-weight-ink flex items-center justify-center shrink-0">
            <BodyPartIcon id={isDefaultMeasure(id) ? id : 'custom'} size={22} />
          </span>
          <span className={`text-sm font-extrabold text-[var(--text)] truncate ${ultra ? 'sr-only' : ''}`}>{name}</span>
        </span>
        <span className="flex items-center gap-2 tabular-nums shrink-0">
          {delta !== 0 && (
            <span title={text.body.change} className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-weight text-weight-ink">
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          <span className="text-base font-extrabold text-[var(--weight-on-surface)]">
            {latest ? `${latest.value} ${unit}` : '–'}
          </span>
        </span>
      </div>

      {inRange.length === 0 ? (
        <p className="py-6 text-center text-xs font-bold text-[var(--muted)]">
          {all?.length ? text.body.noData : text.body.noDataYet}
        </p>
      ) : (
        <div className="pt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
            <span className="text-[var(--muted)]">{formatDateDisplay(point.date, language)}</span>
            <span className="text-[var(--weight-on-surface)] font-extrabold">{point.value} {unit}</span>
          </div>
          <BodyChart entries={inRange} from={from} to={to} label={label} selected={selected} onSelect={setPicked} />
          <div className="flex justify-between px-1 text-[10px] font-bold text-[var(--muted)]">
            <span>{formatDateDisplay(from, language)}</span>
            <span>{formatDateDisplay(to, language)}</span>
          </div>
        </div>
      )}
    </section>
  );
};

/**
 * Body page (left of Statistics, shown when Settings > Advanced > Body measurements is on): one graph per
 * tracked measure for the last 3 months / 6 months / 1 year / a custom period, and Upper body / Lower body /
 * Custom buttons at the bottom that open a pop-up to update a single body part.
 */
export const BodyView: React.FC<{ hideDock?: boolean }> = ({ hideDock = false }) => {
  const { settings, setIsProfileOpen } = useApp();
  const text = useAdvancedText();
  const layoutText = useLayoutText();
  const layoutEnabled = useLayout().enabled;
  const measures = useTrackedMeasures();
  const today = getTodayDateString();
  const [range, setRange] = usePersistentState<RangeKey>('kcalsync_body_range', '3m');
  const [customFrom, setCustomFrom] = useState(monthsAgo(today, 3));
  const [customTo, setCustomTo] = useState(today);
  const [group, setGroup] = useState<BodyGroup | null>(null);

  const { from, to } = useMemo(() => {
    if (range === 'custom') {
      return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
    return { from: monthsAgo(today, MONTHS[range] ?? 3), to: today };
  }, [range, customFrom, customTo, today]);

  const ranges: [RangeKey, string, string][] = [
    ['3m', text.body.r3m, text.body.r3mLong],
    ['6m', text.body.r6m, text.body.r6mLong],
    ['1y', text.body.r1y, text.body.r1yLong],
    ['custom', text.body.rCustom, text.body.rCustom],
  ];

  // A group button exists only when at least one measure of that group is tracked.
  const actions: DockAction[] = BODY_GROUPS
    .filter((g) => measures.some((m) => groupOfMeasure(m.id) === g))
    .map((g) => ({
      id: g,
      icon: <BodyPartIcon id={GROUP_ICON[g]} size={22} />,
      label: text.group[g],
      tone: GROUP_TONE[g],
      onClick: () => setGroup(g),
    }));

  const rangeNode = (
    <div className={settings.ultraMinimal ? 'space-y-3' : 'space-y-4'}>
      <PencilRow page="body">
        <div
          role="group"
          aria-label={text.body.range}
          className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full"
        >
          {ranges.map(([key, short, long]) => (
            <button
              key={key}
              type="button"
              aria-pressed={range === key}
              aria-label={long}
              title={long}
              onClick={() => setRange(key)}
              className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                range === key ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {key === 'custom' && settings.ultraMinimal ? <CalendarDays size={14} /> : short}
            </button>
          ))}
        </div>
      </PencilRow>

      {range === 'custom' && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 px-1">
          {([
            [text.body.from, customFrom, setCustomFrom],
            [text.body.to, customTo, setCustomTo],
          ] as const).map(([label, value, setter]) => (
            <label key={label} className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
              <span>{label}</span>
              <input
                type="date"
                aria-label={label}
                value={value}
                onChange={(event) => event.target.value && setter(event.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );

  // ---- Advanced layout: the range chips and every measure card as fields of the editable grid ----
  const items: LayoutItem[] = [
    { id: 'range', label: layoutText.names.range, node: rangeNode, span: 'col-span-6' },
    ...measures.map((m): LayoutItem => ({
      id: `measure:${m.id}`,
      label: m.name,
      node: <MeasureCard id={m.id} name={m.name} unit={m.unit} from={from} to={to} />,
      span: 'col-span-6',
    })),
  ];

  return (
    <div className={settings.ultraMinimal ? 'space-y-3' : 'space-y-4'}>
      {/* Settings > Advanced > Advanced layout: the pencil icon (and, while editing, the toolbar). */}
      <LayoutToolbar page="body" items={items} extra="measure" pencilItem="range" />
      {layoutEnabled ? (
        <EditableGrid page="body" items={items} className={settings.ultraMinimal ? 'gap-y-3 gap-x-2.5' : 'gap-y-4 gap-x-3 sm:gap-x-4'} />
      ) : rangeNode}

      {measures.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 text-center space-y-3">
          <span className="mx-auto size-12 rounded-2xl bg-weight text-weight-ink flex items-center justify-center">
            <Ruler size={22} />
          </span>
          <div className="text-sm font-extrabold text-[var(--text)]">{text.body.noTrackedTitle}</div>
          <p className="text-xs font-medium text-[var(--muted)]">{text.body.noTrackedText}</p>
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="pressable inline-flex items-center gap-1.5 rounded-2xl bg-[#E2D6FF] text-[#49346F] px-4 py-2.5 text-xs font-extrabold"
          >
            <User size={14} />
            <span>{text.settings.openProfile}</span>
          </button>
        </div>
      ) : (
        !layoutEnabled && measures.map((m) => <MeasureCard key={m.id} id={m.id} name={m.name} unit={m.unit} from={from} to={to} />)
      )}

      <BodyMeasureModal group={group} onClose={() => setGroup(null)} />
      {!hideDock && <ActionDock label={text.body.dock} actions={actions} />}
    </div>
  );
};
