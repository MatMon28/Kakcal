import { Droplets, Flame, Footprints, Scale, Sparkles, Utensils } from 'lucide-react';
import { PoopIcon } from '../common/PoopIcon';
import type { TourLang, TourUi } from '../tour/tourContent';
import { BASE_WIDGET_ACTIONS, WIDGET_ACTIONS, readWidgetAppearance, type WidgetAction, type WidgetSnapshot } from './widgetContract';
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
  if (action === 'food') return <Utensils {...props} />;
  if (action === 'movement') return <Footprints {...props} />;
  if (action === 'water') return <Droplets {...props} />;
  if (action === 'poop') return <PoopIcon size={20} strokeWidth={4.5} />;
  if (action === 'custom') return <Sparkles {...props} />;
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

function EnergyCard({ tone, label, value, pill, bar, compact = false }: {
  tone: keyof typeof TONE;
  label: string;
  value: string;
  pill: string | null;
  /** Progress bar in percent; null hides the bar (the Medium widget). */
  bar: number | null;
  compact?: boolean;
}) {
  const style = TONE[tone];
  const Icon = style.Icon;
  const heroCls = tone === 'intake' ? 'kc-hero-intake' : 'kc-hero-burned';
  if (compact) {
    // Medium (4x2): one line (value, badge, no icon) in a card that is taller than the macro row below it and always the
    // biggest item of the widget; the macro row is exactly as tall as the buttons.
    return (
      <div role="img" aria-label={label} className={`${heroCls} ${style.card} flex min-h-[64px] items-center gap-2 rounded-2xl px-2.5 py-2`}>
        <div className={`min-w-0 flex-1 text-center text-[26px] font-extrabold leading-none tabular-nums tracking-tight ${style.ink}`}>{value}</div>
        {pill && (
          <span className={`kc-balance-badge ${tone === 'intake' ? 'kc-balance-badge-intake' : ''} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${style.pill}`}>{pill}</span>
        )}
      </div>
    );
  }
  return (
    <div role="img" aria-label={label} className={`${heroCls} ${style.card} flex min-h-[104px] p-2.5 flex-col justify-between rounded-2xl`}>
      <div className="flex min-h-5 items-center justify-between gap-1">
        <span className={`inline-flex ${style.accent}`} aria-hidden="true">
          <Icon size={16} />
        </span>
        {pill && (
          <span className={`kc-balance-badge ${tone === 'intake' ? 'kc-balance-badge-intake' : ''} rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${style.pill}`}>{pill}</span>
        )}
      </div>
      <div className={`text-center text-[22px] font-extrabold tabular-nums tracking-tight ${style.ink}`}>{value}</div>
      {bar !== null && (
        <div className={`kc-hero-track h-1.5 w-full overflow-hidden rounded-full ${style.track}`}>
          <div className={`kc-hero-fill h-full rounded-full transition-[width] duration-500 ${style.fill}`} style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}

function MacroCard({ tone, label, grams, percent, letter, compact = false }: {
  tone: keyof typeof MACRO;
  label: string;
  grams: string;
  /** Share of calories; null hides it (the Medium widget). */
  percent: string | null;
  /** Macro letter in the top-left corner (the Large widget). */
  letter?: string;
  /** Medium: exactly as tall as the 48 px buttons below it. */
  compact?: boolean;
}) {
  const style = MACRO[tone];
  return (
    <div
      role="img"
      aria-label={percent === null ? `${label}: ${grams} g` : `${label}: ${grams} g, ${percent}%`}
      className={`kc-macro-${tone} ${style.card} relative rounded-2xl px-1.5 text-center ${compact ? 'flex h-12 items-center justify-center' : 'py-2'}`}
    >
      {letter && (
        <span aria-hidden="true" className={`absolute left-2 top-1.5 text-[10px] font-extrabold leading-none ${style.percent}`}>
          {letter}
        </span>
      )}
      <div className={`${compact ? 'text-sm' : 'text-base'} font-extrabold tabular-nums tracking-tight ${style.value}`}>{grams}</div>
      {percent !== null && <div className={`text-[11px] font-bold tabular-nums ${style.percent}`}>{percent}%</div>}
    </div>
  );
}

/** Small and Extra-small: translucent trays, so the wallpaper shows through. */
function QuickWidget({ label, actions, ui, snapshot, onAction, dark = false }: {
  label: string;
  actions: readonly WidgetAction[];
  ui: TourUi;
  snapshot: WidgetSnapshot | null;
  onAction: (action: WidgetAction) => void;
  dark?: boolean;
}) {
  return (
    <div className={`quick-widget${dark ? ' quick-widget-dark' : ''}`}>
      <ActionRow actions={actions} label={label} ui={ui} snapshot={snapshot} onAction={onAction} />
    </div>
  );
}

/** Large: intake and burned, then macros, then the five actions. Same layout as Ultra minimal Today. */
function LargeWidget({ ui, lang, snapshot, onAction, compact = false }: GalleryProps & { compact?: boolean }) {
  const look = readWidgetAppearance();
  const letters = lang === 'it' ? ['C', 'P', 'G'] : ['C', 'P', 'F'];
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
    <div role="group" aria-label={compact ? ui.widgetLabels.medium : ui.widgetLabels.large} className={`widget-large rounded-3xl border p-2.5 ${look.style === 'dark' ? 'widget-large-dark border-white/20 text-white' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
      <div className="grid grid-cols-2 gap-2">
        <EnergyCard
          tone="intake"
          label={`${ui.intake}: ${kcal(intake)} kcal`}
          value={kcal(intake)}
          pill={snapshot && net > 0 ? `+${whole.format(net)}` : null}
          bar={compact ? null : intakeBar}
          compact={compact}
        />
        <EnergyCard
          tone="burned"
          label={`${ui.burned}: ${kcal(burned)} kcal`}
          value={kcal(burned)}
          pill={snapshot && net <= 0 ? (net === 0 ? '0' : `-${whole.format(-net)}`) : null}
          bar={compact ? null : burnedBar}
          compact={compact}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <MacroCard compact={compact} tone="carbs" label={ui.carbs} grams={grams(snapshot?.carbsGrams ?? 0)} letter={compact ? undefined : letters[0]} percent={compact ? null : percent(snapshot?.carbsPercent ?? 0)} />
        <MacroCard compact={compact} tone="protein" label={ui.protein} grams={grams(snapshot?.proteinGrams ?? 0)} letter={compact ? undefined : letters[1]} percent={compact ? null : percent(snapshot?.proteinPercent ?? 0)} />
        <MacroCard compact={compact} tone="fat" label={ui.fat} grams={grams(snapshot?.fatGrams ?? 0)} letter={compact ? undefined : letters[2]} percent={compact ? null : percent(snapshot?.fatPercent ?? 0)} />
      </div>
      <div className={`widget-large-divider mt-2.5 border-t pt-2.5 ${look.style === 'dark' ? 'border-white/20' : 'border-[var(--border)]'}`}>
        <ActionRow
          actions={look.customButton ? WIDGET_ACTIONS : BASE_WIDGET_ACTIONS}
          label={compact ? ui.widgetLabels.medium : ui.widgetLabels.large}
          groupLabel={`${compact ? ui.widgetLabels.medium : ui.widgetLabels.large} ${ui.actionsLabel}`}
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
  const look = readWidgetAppearance();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
        <span>{ui.widgetsHeading}</span>
        <span className="inline-flex items-center gap-2 text-[var(--text)]">
          <span className={`size-1.5 rounded-full ${snapshot ? 'bg-intake-accent' : 'bg-[var(--border)]'}`} aria-hidden="true" />
          {snapshot ? ui.connected : ui.connecting}
        </span>
      </div>

      <div className="widget-wallpaper space-y-5 rounded-3xl border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-5">
          <figure className="min-w-0 flex-[1_1_290px] space-y-2">
            <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
              <span>{ui.smallTitle}</span>
              <span className="text-[var(--muted)]">{ui.smallMeta} · {ui.primary}</span>
            </figcaption>
            <QuickWidget label={ui.widgetLabels.small} actions={look.customButton ? WIDGET_ACTIONS : BASE_WIDGET_ACTIONS} ui={ui} snapshot={snapshot} onAction={onAction} dark={look.style === 'dark'} />
          </figure>
          <figure className="min-w-0 flex-[0_1_210px] space-y-2">
            <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
              <span>{ui.extraTitle}</span>
              <span className="text-[var(--muted)]">{ui.extraMeta}</span>
            </figcaption>
            <QuickWidget label={ui.widgetLabels.extra} actions={EXTRA_SMALL_ACTIONS} ui={ui} snapshot={snapshot} onAction={onAction} dark={look.style === 'dark'} />
          </figure>
        </div>

        <figure className="space-y-2">
          <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
            <span>{ui.largeTitle}</span>
            <span className="text-[var(--muted)]">{ui.largeMeta}</span>
          </figcaption>
          <LargeWidget {...props} />
        </figure>
          <figure className="min-w-0 space-y-2">
            <figcaption className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--text)]">
              <span>{ui.mediumTitle}</span>
              <span className="text-[var(--muted)]">{ui.mediumMeta}</span>
            </figcaption>
            <LargeWidget {...props} compact />
          </figure>
      </div>

      <p className="text-xs font-semibold text-[var(--muted)]">{ui.widgetsHint}</p>
    </div>
  );
}
