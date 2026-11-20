import { useAdvancedText } from '../../i18n/advanced';
import { goalState, useAdvanced } from '../../utils/advancedStore';
import type { GoalKey } from '../../types/advanced';

/**
 * Tiny round icon shown inside a Today field when its goal is reached:
 * a check on a soft green disc for an objective, an exclamation on a soft red disc for a limit
 * (same pastel palette as the rest of the app). Renders nothing when goals are off, the goal is off
 * or it is not reached yet, so it takes no space.
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
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full anim-value ${
        objective ? 'bg-[#C9EFD3] text-[#174A2B]' : 'bg-[#F6D0D0] text-[#7A2727]'
      } ${className}`}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {objective ? <path d="M2.5 6.3L5 8.8L9.5 3.5" /> : <path d="M6 2.5V6.5M6 9.3V9.3" />}
      </svg>
    </span>
  );
}
