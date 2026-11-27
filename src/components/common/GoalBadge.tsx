import { AlertTriangle, CircleCheck } from 'lucide-react';
import { useAdvancedText } from '../../i18n/advanced';
import { goalState, useAdvanced } from '../../utils/advancedStore';
import { useApp } from '../../context/AppContext';
import type { GoalKey } from '../../types/advanced';
import type { ThemeStyle } from '../../types';
import { BorderProgressRing } from './BorderProgressRing';

/**
 * Small badge shown inside a Today field when its goal is reached:
 *  - objective reached: a check inside the style's own container shape,
 *  - limit reached / exceeded: a warning triangle with an exclamation mark.
 *
 * The badge belongs to the style and theme it is drawn in instead of using fixed colours:
 *  - the outline and glyph are the ink of the card the badge sits on (`currentColor`), tinted a little towards
 *    green (objective) or red (limit) with `color-mix`, so contrast is always the card's own contrast on every
 *    theme, on pastel, gradient, glass, dark and single-hue (Mono) cards alike;
 *  - the container shape follows the style: circle (classic, aurora, playful, mono, glass, material), chamfered octagon (angular),
 *    hard square with a heavier line (pop) and hairline rounded square (minimal); line joins are mitred in the
 *    angular and pop styles.
 * The two shapes differ as well as the tints, so they can be told apart without colours. Renders nothing when goals
 * are off, the goal is off or it is not reached yet, so it takes no space.
 */

type Shape = 'circle' | 'octagon' | 'square' | 'rounded';

const STYLE_LOOK: Record<ThemeStyle, { shape: Shape; width: number; join: 'round' | 'miter' }> = {
  classic: { shape: 'circle', width: 2.2, join: 'round' },
  aurora: { shape: 'circle', width: 2.2, join: 'round' },
  playful: { shape: 'circle', width: 2.4, join: 'round' },
  mono: { shape: 'circle', width: 2.2, join: 'round' },
  glass: { shape: 'circle', width: 2.2, join: 'round' },
  material: { shape: 'circle', width: 2.2, join: 'round' },
  angular: { shape: 'octagon', width: 2.2, join: 'miter' },
  pop: { shape: 'square', width: 2.8, join: 'miter' },
  minimal: { shape: 'rounded', width: 1.7, join: 'round' },
};

const GOOD = '#16a34a';
const BAD = '#dc2626';
const tint = (c: string) => `color-mix(in srgb, ${c} 62%, currentColor)`;
const wash = (c: string) => `color-mix(in srgb, ${c} 26%, transparent)`;

function Container({ shape }: { shape: Shape }) {
  switch (shape) {
    case 'octagon':
      return <path d="M8.2 2.8H15.8L21.2 8.2V15.8L15.8 21.2H8.2L2.8 15.8V8.2Z" />;
    case 'square':
      return <rect x="3" y="3" width="18" height="18" />;
    case 'rounded':
      return <rect x="3" y="3" width="18" height="18" rx="5" />;
    default:
      return <circle cx="12" cy="12" r="9.2" />;
  }
}

export function GoalBadge({ goal, amount, className = '' }: { goal: GoalKey; amount: number; className?: string }) {
  const config = useAdvanced();
  const text = useAdvancedText();
  const { settings, userProfile } = useApp();
  const state = goalState(config, goal, amount, userProfile.weightKg);
  if (!state || !state.reached) return null;

  const look = STYLE_LOOK[settings.themeStyle] ?? STYLE_LOOK.classic;
  const objective = state.mode === 'objective';
  const label = objective ? text.goal.objectiveReached : state.exceeded ? text.goal.limitExceeded : text.goal.limitReached;
  const color = objective ? GOOD : BAD;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-goal-badge={objective ? 'objective' : 'limit'}
      className={`inline-flex size-[18px] shrink-0 items-center justify-center anim-value ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={look.width}
        strokeLinecap="round"
        strokeLinejoin={look.join}
        // currentColor is the ink of the card the badge sits on; the tints are applied on top of it.
        style={{ stroke: tint(color), fill: wash(color), overflow: 'visible' }}
      >
        {objective ? (
          <>
            <Container shape={look.shape} />
            <path d="M7.6 12.3L10.7 15.3L16.4 9" fill="none" strokeWidth={look.width + 0.4} />
          </>
        ) : (
          <>
            <path d="M12 3.2L21.6 20H2.4Z" />
            <path d="M12 9.6V14" fill="none" strokeWidth={look.width + 0.4} />
            <path d="M12 17.1H12.01" fill="none" strokeWidth={look.width + 0.8} />
          </>
        )}
      </svg>
    </span>
  );
}

const roundDisplay = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Perimeter border progress ring + bottom-right status readout for Today summary tiles.
 * Renders nothing when no goal/limit is active for the metric, causing zero layout shift.
 */
export function TileGoalOverlay({
  goal,
  amount,
  unit,
  ultraMinimal = false,
  formatNumber,
}: {
  goal: GoalKey;
  amount: number;
  unit: string;
  ultraMinimal?: boolean;
  formatNumber?: (n: number) => string;
}) {
  const config = useAdvanced();
  const text = useAdvancedText();
  const { userProfile } = useApp();
  const state = goalState(config, goal, amount, userProfile.weightKg);
  if (!state) return null;

  const fmt = formatNumber ?? roundDisplay;
  const isMinReached = state.mode === 'objective' && state.reached;
  const isMaxExceeded = state.mode === 'limit' && state.exceeded;
  const excess = isMaxExceeded ? Math.max(0, Math.round((amount - state.value) * 100) / 100) : 0;

  const ariaLabel = isMinReached
    ? text.goal.objectiveReached
    : isMaxExceeded
      ? `${fmt(excess)}${unit} ${text.goal.over}`
      : `${fmt(amount)} / ${fmt(state.value)}${unit}`;

  return (
    <>
      <BorderProgressRing value={amount} target={state.value} />
      <span
        data-goal-readout={isMaxExceeded ? 'exceeded' : isMinReached ? 'reached' : 'progress'}
        title={ariaLabel}
        aria-label={ariaLabel}
        style={isMinReached || isMaxExceeded ? { color: 'var(--ring-fill, currentColor)' } : undefined}
        className={`pointer-events-none absolute ${
          ultraMinimal ? 'bottom-2 right-2.5 text-[10px]' : 'bottom-[11px] right-3.5 text-[11px]'
        } inline-flex max-w-[calc(100%-24px)] items-center gap-1 whitespace-nowrap font-bold tabular-nums leading-none ${
          isMinReached || isMaxExceeded ? '' : 'opacity-[0.78]'
        }`}
      >
        {isMinReached && <CircleCheck size={14} stroke="currentColor" strokeWidth={2.2} className="shrink-0" aria-hidden="true" />}
        {isMaxExceeded && <AlertTriangle size={14} stroke="currentColor" strokeWidth={2.2} className="shrink-0" aria-hidden="true" />}
        <span className="truncate">
          {isMaxExceeded
            ? `${fmt(excess)}${ultraMinimal ? '' : unit} ${text.goal.over}`
            : `${fmt(amount)} / ${fmt(state.value)}${ultraMinimal ? '' : unit}`}
        </span>
      </span>
    </>
  );
}
