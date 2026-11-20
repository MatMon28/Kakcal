import { useAdvancedText } from '../../i18n/advanced';
import { goalState, useAdvanced } from '../../utils/advancedStore';
import type { GoalKey } from '../../types/advanced';

/**
 * Small badge shown inside a Today field when its goal is reached:
 *  - objective reached: a solid green circle with a white check,
 *  - limit reached / exceeded: a solid red warning triangle with a white exclamation mark.
 *
 * Both are one inline SVG with fixed colours, a white ring and a thin dark halo, so they stay clearly visible
 * on every theme (light, dark, pastel, the style themes that force `color: inherit` inside the nutrient cards).
 * The two shapes differ as well as the colours, so they can be told apart without seeing colours. Renders nothing
 * when goals are off, the goal is off or it is not reached yet, so it takes no space.
 */
export function GoalBadge({ goal, amount, className = '' }: { goal: GoalKey; amount: number; className?: string }) {
  const config = useAdvanced();
  const text = useAdvancedText();
  const state = goalState(config, goal, amount);
  if (!state || !state.reached) return null;

  const objective = state.mode === 'objective';
  const label = objective ? text.goal.objectiveReached : state.exceeded ? text.goal.limitExceeded : text.goal.limitReached;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-goal-badge={objective ? 'objective' : 'limit'}
      className={`inline-flex size-5 shrink-0 items-center justify-center anim-value ${className}`}
      style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.55)) drop-shadow(0 1px 1.5px rgba(0,0,0,0.25))' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {objective ? (
          <>
            <circle cx="12" cy="12" r="10" fill="#15A04A" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M7 12.4L10.6 16L17.2 8.6" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M12 2.8L22 20.2H2Z" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M12 9V14.2" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="12" cy="17.2" r="1.5" fill="#FFFFFF" />
          </>
        )}
      </svg>
    </span>
  );
}
