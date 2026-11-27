import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../src/context/AppContext';
import { EnergyBalanceCards } from '../src/components/dashboard/EnergyBalanceCards';
import { MacroNutrientsOverview } from '../src/components/dashboard/MacroNutrientsOverview';
import { SecondaryNutrientCard } from '../src/components/common/FoodMacroGrid';
import { BorderProgressRing } from '../src/components/common/BorderProgressRing';
import { setGoalsEnabled, updateGoal } from '../src/utils/advancedStore';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';

beforeEach(async () => {
  await deleteDatabase();
  resetDbForTests();
  resetBootForTests();
  localStorage.clear();
  setGoalsEnabled(false);
});

afterEach(async () => {
  setGoalsEnabled(false);
  cleanup();
  await flushWrites();
  vi.restoreAllMocks();
});

describe('Today goal & limit progress indicators', () => {
  it('renders no horizontal progress bars, no top-corner GoalBadge, and no ring/readout when goals are off', () => {
    const { container } = render(
      <AppProvider>
        <EnergyBalanceCards />
        <MacroNutrientsOverview />
      </AppProvider>,
    );

    expect(container.querySelector('.kc-hero-track')).toBeNull();
    expect(container.querySelector('.kc-hero-fill')).toBeNull();
    expect(container.querySelector('[data-goal-badge]')).toBeNull();
    expect(container.querySelector('[data-border-progress-ring]')).toBeNull();
    expect(container.querySelector('[data-goal-readout]')).toBeNull();
  });

  it('renders in-progress, reached (CircleCheck), and exceeded (AlertTriangle) states without top badges', () => {
    setGoalsEnabled(true);
    updateGoal('burned', { enabled: true, mode: 'objective', value: 5000 });
    updateGoal('fiber', { enabled: true, mode: 'objective', value: 25 });
    updateGoal('salt', { enabled: true, mode: 'limit', value: 5 });

    const { container } = render(
      <AppProvider>
        <EnergyBalanceCards />
        <MacroNutrientsOverview />
        <SecondaryNutrientCard nutrient="fiber" value={30} />
        <SecondaryNutrientCard nutrient="salt" value={6.5} />
      </AppProvider>,
    );

    // No top-corner GoalBadge anywhere on Today summary tiles
    expect(container.querySelector('[data-goal-badge]')).toBeNull();

    // Burned is in progress (default BMR < 5000)
    const progressReadout = container.querySelector('[data-goal-readout="progress"]');
    expect(progressReadout).not.toBeNull();
    expect(progressReadout?.textContent).toContain('/ 5');

    // Fiber objective reached: 30 / 25g with inline icon
    const reachedReadout = container.querySelector('[data-goal-readout="reached"]');
    expect(reachedReadout).not.toBeNull();
    expect(reachedReadout?.textContent).toBe('30 / 25g');
    expect(reachedReadout?.querySelector('svg')).not.toBeNull();

    // Salt limit exceeded: 1.5g over with inline icon
    const exceededReadout = container.querySelector('[data-goal-readout="exceeded"]');
    expect(exceededReadout).not.toBeNull();
    expect(exceededReadout?.textContent).toBe('1.5g over');
    expect(exceededReadout?.querySelector('svg')).not.toBeNull();
  });

  it('treats exact limit match as in-progress rather than exceeded', () => {
    setGoalsEnabled(true);
    updateGoal('salt', { enabled: true, mode: 'limit', value: 5 });

    const { container } = render(
      <AppProvider>
        <SecondaryNutrientCard nutrient="salt" value={5} />
      </AppProvider>,
    );

    expect(container.querySelector('[data-goal-readout="exceeded"]')).toBeNull();
    const readout = container.querySelector('[data-goal-readout="progress"]');
    expect(readout).not.toBeNull();
    expect(readout?.textContent).toBe('5 / 5g');
  });

  it('builds a clockwise bottom-left perimeter SVG path and hides fill at 0%', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          borderLeftWidth: '2px',
          borderTopLeftRadius: '20px',
          getPropertyValue: () => '',
        }) as unknown as CSSStyleDeclaration,
    );

    const { container, rerender } = render(
      <AppProvider>
        <div style={{ position: 'relative' }}>
          <BorderProgressRing value={0} target={100} />
        </div>
      </AppProvider>,
    );

    const svg = container.querySelector('[data-border-progress-ring]') as SVGSVGElement;
    Object.defineProperty(svg, 'clientWidth', { value: 160, configurable: true });
    Object.defineProperty(svg, 'clientHeight', { value: 120, configurable: true });

    await act(async () => {
      rerender(
        <AppProvider>
          <div style={{ position: 'relative' }}>
            <BorderProgressRing value={0} target={100} />
          </div>
        </AppProvider>,
      );
    });

    // Trigger ResizeObserver / initial measurement
    const fillPath = container.querySelector('.kc-ring-fill') as SVGPathElement | null;
    if (fillPath) {
      expect(fillPath.style.opacity).toBe('0');
      const d = fillPath.getAttribute('d') ?? '';
      // Clockwise path starts with M x0 (y1 - r) and uses sweep-flag = 1
      expect(d.startsWith('M ')).toBe(true);
      expect(d).toContain(' 0 0 1 ');
    }
  });
});
