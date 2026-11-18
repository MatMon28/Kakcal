import { Droplets, Flame, Footprints, Scale, Utensils, UtensilsCrossed } from 'lucide-react';
import { PoopIcon } from '../common/PoopIcon';
import type { TourLang, TourUi } from '../tour/tourContent';
import { WIDGET_ACTIONS, type WidgetAction, type WidgetSnapshot } from './widgetContract';
import './widget-preview.css';

interface GalleryProps {
  ui: TourUi;
  lang: TourLang;
  snapshot: WidgetSnapshot | null;
  onAction: (action: WidgetAction) => void;
}

const EXTRA_SMALL_ACTIONS: readonly WidgetAction[] = ['food', 'water', 'poop'];

function ActionIcon({ action }: { action: WidgetAction }) {
  const props = { size: 20, strokeWidth: 1.9, 'aria-hidden': true as const };
  if (action === 'food') return <UtensilsCrossed {...props} />;
  if (action === 'movement') return <Footprints {...props} />;
  if (action === 'water') return <Droplets {...props} />;
  if (action === 'poop') return <PoopIcon size={20} strokeWidth={4.5} />;
  return <Scale {...props} />;
}

/** Icon-only shortcut row. Each button keeps its name for screen readers and a tooltip. */
function ActionRow({ actions, label, ui, snapshot, onAction, groupLabel = label }: {
  actions: readonly WidgetAction[];
  label: string;
  ui: TourUi;
  snapshot: WidgetSnapshot | null;
  onAction: (action: WidgetAction) => void;
  /** Name of the row itself; defaults to the widget name, which the buttons prefix. */
  groupLabel?: string;
}) {
  return (
    <div className="widget-actions" role="group" aria-label={groupLabel}>
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          className={`widget-action widget-action-${action}`}
          disabled={!snapshot}
          onClick={() => onAction(action)}
          aria-label={`${label}: ${ui.actions[action]}`}
          title={ui.actions[action]}
        >
          <span className="widget-action-icon">
            <ActionIcon action={action} />
          </span>
        </button>
      ))}
    </div>
  );
}

const TONE = {
  intake: {
    card: 'bg-intake', accent: 'text-intake-accent', ink: 'text-intake-ink',
    track: 'bg-intake-soft', fill: 'bg-intake-accent', pill: 'bg-intake-accent text-intake-soft',
    Icon: Utensils,
  },
  burned: {
    card: 'bg-activity', accent: 'text-activity-accent', ink: 'text-activity-ink',
    track: 'bg-activity-soft', fill: 'bg-activity-accent', pill: 'bg-activity-accent text-activity-soft',
    Icon: Flame,
  },
} as const;

/** The Ultra minimal macro cards: blue carbs, peach protein, lavender fat. */
const MACRO = {
  carbs: { card: 'bg-[#CFE7FE]', value: 'text-[#0F3355]', percent: 'text-[#1A4670]' },
  protein: { card: 'bg-[#FAE0B4]', value: 'text-[#2D1E0B]', percent: 'text-[#7D4E14]' },
  fat: { card: 'bg-[#E2D6FF]', value: 'text-[#1F1636]', percent: 'text-[#523A8C]' },
} as const;

function EnergyCard({ tone, label, value, pill, bar }: {
  tone: keyof typeof TONE;
  label: string;
  value: string;
  pill: string | null;
  bar: number;
}) {
  const style = TONE[tone];
  const Icon = style.Icon;
  return (
    <div role="img" aria-label={label} className={`${style.card} flex min-h-[104px] flex-col justify-between rounded-2xl p-2.5`}>
      <div className="flex min-h-5 items-center justify-between gap-1">
        <span className={`inline-flex ${style.accent}`} aria-hidden="true">
          <Icon size={16} />
        </span>
        {pill && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${style.pill}`}>{pill}</span>
        )}
      </div>
      <div className={`text-center text-[22px] font-extrabold tabular-nums tracking-tight ${style.ink}`}>{value}</div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${style.track}`}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${style.fill}`} style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

function MacroCard({ tone, label, grams, percent }: {
  tone: keyof typeof MACRO;
  label: string;
  grams: string;
  percent: string;
}) {
  const style = MACRO[tone];
  return (
    <div role="img" aria-label={`${label}: ${grams} g, ${percent}%`} className={`${style.card} rounded-2xl px-1.5 py-2 text-center`}>
      <div className={`text-base font-extrabold tabular-nums tracking-tight ${style.value}`}>{grams}</div>
      <div className={`text-[11px] font-bold tabular-nums ${style.percent}`}>{percent}%</div>
    </div>
  );
}

/** Small and Extra-small: translucent trays, so the wallpaper shows through. */
function QuickWidget({ label, actions, ui, snapshot, onAction }: {
  label: string;
  actions: readonly WidgetAction[];
  ui: TourUi;
  snapshot: WidgetSnapshot | null;
  onAction: (action: WidgetAction) => void;
}) {
  return (
    <div className="quick-widget">
      <ActionRow actions={actions} label={label} ui={ui} snapshot={snapshot} onAction={onAction} />
    </div>
  );
}

/** Large: intake and burned, then macros, then the five actions. Same layout as Ultra minimal Today. */
function LargeWidget({ ui, lang, snapshot, onAction }: GalleryProps) {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const tenth = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const intake = snapshot?.calories ?? 0;
  const burned = snapshot?.burnedCalories ?? 0;
  const net = intake - burned;
  const scale = Math.max(intake, burned, 1);
  const intakeBar = snapshot && intake > 0 ? Math.max(5, Math.round((intake / scale) * 100)) : 0;
  const burnedBar = snapshot ? Math.max(5, Math.round((burned / scale) * 100)) : 0;

  const kcal = (value: number) => (snapshot ? whole.format(value) : '--');
  const grams = (value: number) => (snapshot ? tenth.format(value) : '--');
  const percent = (value: number) => (snapshot ? `${Math.round(value)}` : '--');

  return (
    <div role="group" aria-label={ui.widgetLabels.large} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <EnergyCard
          tone="intake"
          label={`${ui.intake}: ${kcal(intake)} kcal`}
          value={kcal(intake)}
          pill={snapshot && net > 0 ? `+${whole.format(net)}` : null}
          bar={intakeBar}
        />
        <EnergyCard
          tone="burned"
          label={`${ui.burned}: ${kcal(burned)} kcal`}
          value={kcal(burned)}
          pill={snapshot && net <= 0 ? (net === 0 ? '0' : `-${whole.format(-net)}`) : null}
          bar={burnedBar}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <MacroCard tone="carbs" label={ui.carbs} grams={grams(snapshot?.carbsGrams ?? 0)} percent={percent(snapshot?.carbsPercent ?? 0)} />
        <MacroCard tone="protein" label={ui.protein} grams={grams(snapshot?.proteinGrams ?? 0)} percent={percent(snapshot?.proteinPercent ?? 0)} />
        <MacroCard tone="fat" label={ui.fat} grams={grams(snapshot?.fatGrams ?? 0)} percent={percent(snapshot?.fatPercent ?? 0)} />
      </div>
      <div className="mt-2.5 border-t border-[var(--border)] pt-2.5">
        <ActionRow
          actions={WIDGET_ACTIONS}
          label={ui.widgetLabels.large}
          groupLabel={`${ui.widgetLabels.large} ${ui.actionsLabel}`}
          ui={ui}
          snapshot={snapshot}
          onAction={onAction}
        />
      </div>
    </div>
  );
}

/** The three widget designs, shown on a wallpaper drawn from the app's pastel accents. */
export function WidgetGallery(props: GalleryProps) {
  const { ui, snapshot, onAction } = props;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
        <span>{ui.widgetsHeading}</span>
        <span className="inline-flex items-center gap-2 text-[var(--text)]">
          <span className={`size-1.5 rounded-full ${snapshot ? 'bg-intake-accent' : 'bg-[var(--border)]'}`} aria-hidden="true" />
          {snapshot ? ui.connected : ui.connecting}
        </span>
      </div>

      <div className="widget-wallpaper space-y-5 rounded-[28px] border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-5">
          <figure className="min-w-0 flex-[1_1_290px] space-y-2">
            <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
              <span>{ui.smallTitle}</span>
              <span className="text-[var(--muted)]">{ui.smallMeta} · {ui.primary}</span>
            </figcaption>
            <QuickWidget label={ui.widgetLabels.small} actions={WIDGET_ACTIONS} ui={ui} snapshot={snapshot} onAction={onAction} />
          </figure>
          <figure className="min-w-0 flex-[0_1_210px] space-y-2">
            <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
              <span>{ui.extraTitle}</span>
              <span className="text-[var(--muted)]">{ui.extraMeta}</span>
            </figcaption>
            <QuickWidget label={ui.widgetLabels.extra} actions={EXTRA_SMALL_ACTIONS} ui={ui} snapshot={snapshot} onAction={onAction} />
          </figure>
        </div>

        <figure className="space-y-2">
          <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
            <span>{ui.largeTitle}</span>
            <span className="text-[var(--muted)]">{ui.largeMeta}</span>
          </figcaption>
          <LargeWidget {...props} />
        </figure>
      </div>

      <p className="text-xs font-semibold text-[var(--muted)]">{ui.widgetsHint}</p>
    </div>
  );
}
