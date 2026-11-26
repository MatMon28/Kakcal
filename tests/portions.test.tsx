import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';
import { STANDARD_PORTIONS_BY_ID, getPrimaryStandardPortion } from '../src/data/standardPortions';
import {
  addCustomPortion,
  exportCustomPortions,
  getCustomPortions,
  importCustomPortions,
  removeCustomPortion,
  resetCustomPortionsForTests,
} from '../src/utils/customPortions';
import {
  amountToPortions,
  formatPortionCount,
  getFoodPortions,
  parseDecimalInput,
  portionsToAmount,
  portionStepDown,
  portionStepUp,
} from '../src/utils/foodPortions';
import { getDefaultAmount } from '../src/utils/amountMemory';
import type { FoodItem } from '../src/types';

vi.mock('../src/context/AppContext', () => ({
  useSettings: () => ({ language: 'en' }),
}));

import { AmountSelector } from '../src/components/common/AmountSelector';

beforeEach(() => {
  localStorage.clear();
  resetCustomPortionsForTests();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCustomPortionsForTests();
});

describe('standard portions catalog', () => {
  it('references only real bundled food ids with valid non-100g portions and EN/IT labels', () => {
    const foodIds = new Set(VERIFIED_FOODS.map((f) => f.id));
    for (const [id, portions] of Object.entries(STANDARD_PORTIONS_BY_ID)) {
      expect(foodIds.has(id), `unknown food id ${id}`).toBe(true);
      expect(portions.length, `empty portions for ${id}`).toBeGreaterThan(0);
      for (const p of portions) {
        expect(p.grams, `${id}.${p.id} grams`).toBeGreaterThan(0);
        expect(Math.abs(p.grams - 100), `${id}.${p.id} should not be 100g`).toBeGreaterThan(0.01);
        expect(p.label.trim().length, `${id}.${p.id} EN label`).toBeGreaterThan(0);
        expect(p.label_it?.trim().length, `${id}.${p.id} IT label`).toBeGreaterThan(0);
      }
    }
  });

  it('includes small, medium and large sizes for eggs and common produce', () => {
    for (const id of ['gen-18', 'gen-01', 'gen-02', 'gen-10', 'gen-08', 'gen-12']) {
      const labels = STANDARD_PORTIONS_BY_ID[id].map((p) => p.label.toLowerCase()).join(' ');
      expect(labels, `${id} small`).toContain('small');
      expect(labels, `${id} medium`).toContain('medium');
      expect(labels, `${id} large`).toContain('large');
    }
    expect(getPrimaryStandardPortion('gen-18')).toBe(50);
    expect(getDefaultAmount({ id: 'gen-18' })).toBe(50);
  });
});

describe('foodPortions math and parsing', () => {
  it('parses both comma and dot decimals like 1,78', () => {
    expect(parseDecimalInput('1,78')).toBe(1.78);
    expect(parseDecimalInput('1.78')).toBe(1.78);
    expect(parseDecimalInput('0,25')).toBe(0.25);
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('.')).toBeNull();
    expect(portionsToAmount(1.78, 150)).toBe(267);
    expect(amountToPortions(267, 150)).toBe(1.78);
    expect(formatPortionCount(1.78, 'it')).toBe('1,78');
    expect(formatPortionCount(1.78, 'en')).toBe('1.78');
  });

  it('steps portions smoothly across fractions and whole counts', () => {
    expect(portionStepUp(0.25)).toBe(0.5);
    expect(portionStepUp(0.75)).toBe(1);
    expect(portionStepUp(1)).toBe(1.5);
    expect(portionStepUp(3)).toBe(4);
    expect(portionStepDown(4)).toBe(3);
    expect(portionStepDown(1.5)).toBe(1);
    expect(portionStepDown(0.5)).toBe(0.25);
  });
});

describe('customPortions store', () => {
  it('stores multiple custom portions per food, removes individual ones, and round-trips backup', () => {
    const p1 = addCustomPortion('test-food', 45, 'Small bowl');
    const p2 = addCustomPortion('test-food', 180, 'Big bowl');
    expect(p1).not.toBeNull();
    expect(p2).not.toBeNull();
    expect(getCustomPortions('test-food')).toHaveLength(2);

    const exported = exportCustomPortions();
    resetCustomPortionsForTests();
    expect(getCustomPortions('test-food')).toEqual([]);

    importCustomPortions(exported);
    expect(getCustomPortions('test-food')).toHaveLength(2);

    removeCustomPortion('test-food', p1!.id);
    expect(getCustomPortions('test-food').map((p) => p.label)).toEqual(['Big bowl']);
  });

  it('merges explicit food portions, standard portions, and custom portions excluding 100g', () => {
    const custom = addCustomPortion('gen-18', 110, '2 eggs');
    const list = getFoodPortions({ id: 'gen-18', unit: 'g', portion: 100 }, custom ? [custom] : []);
    expect(list.some((p) => p.grams === 100)).toBe(false);
    expect(list.some((p) => p.id === 'egg-m')).toBe(true);
    expect(list.some((p) => p.label === '2 eggs')).toBe(true);
  });
});

describe('AmountSelector with portions', () => {
  const yogurt: FoodItem = {
    id: 'lidl-18',
    name_de: 'Griechischer Joghurt',
    name_it: 'Yogurt Greco',
    name_en: 'Greek Yogurt',
    store: 'Lidl',
    category: 'dairy',
    unit: 'g',
    calories: 73,
    carbs: 3.8,
    protein: 9.7,
    fat: 2.0,
    fiber: 0,
    salt: 0.1,
  };

  const plainChicken: FoodItem = {
    id: 'custom-plain-food',
    name_de: 'Test',
    name_it: 'Test',
    name_en: 'Test Plain',
    store: 'Custom',
    category: 'meat_fish',
    unit: 'g',
    calories: 165,
    carbs: 0,
    protein: 31,
    fat: 3.6,
    fiber: 0,
    salt: 0.1,
  };

  it('opens in Portions mode when food has non-100g portions and shows weight next to portion count', () => {
    const onChange = vi.fn();
    render(<AmountSelector value={150} onChange={onChange} unit="g" food={yogurt} />);

    expect(document.querySelector('[data-portions-panel]')).toBeTruthy();
    expect(document.querySelector('[data-portion-weight-pill]')?.textContent).toBe('150g');

    const input = screen.getByLabelText('Number of portions') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1,78' } });
    expect(onChange).toHaveBeenLastCalledWith(267);
    expect(input.value).toBe('1,78');
  });

  it('switches to Weight mode, saves multiple custom portions, and removes them', () => {
    let val = 150;
    const onChange = vi.fn((next: number) => { val = next; });
    const view = render(<AmountSelector value={val} onChange={onChange} unit="g" food={yogurt} />);

    fireEvent.click(screen.getByRole('button', { name: /Weight \(g\)/ }));
    expect(document.querySelector('[data-weight-panel]')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '250g' }));
    view.rerender(<AmountSelector value={val} onChange={onChange} unit="g" food={yogurt} />);

    fireEvent.click(screen.getByRole('button', { name: /Save 250g as custom portion/ }));
    expect(document.querySelector('[data-custom-portion-form]')).toBeTruthy();

    const weightInput = screen.getByLabelText('Custom portion amount') as HTMLInputElement;
    const labelInput = screen.getByLabelText('Custom portion label') as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: '185' } });
    fireEvent.change(labelInput, { target: { value: 'Big bowl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & use' }));

    view.rerender(<AmountSelector value={val} onChange={onChange} unit="g" food={yogurt} />);
    expect(val).toBe(185);
    expect(document.querySelector('[data-portions-panel]')).toBeTruthy();
    expect(screen.getByText(/Big bowl/)).toBeTruthy();

    // Save a second custom portion to confirm multiple custom portions coexist
    fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
    fireEvent.change(screen.getByLabelText('Custom portion amount'), { target: { value: '95' } });
    fireEvent.change(screen.getByLabelText('Custom portion label'), { target: { value: 'Mini cup' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & use' }));
    view.rerender(<AmountSelector value={val} onChange={onChange} unit="g" food={yogurt} />);
    expect(val).toBe(95);
    expect(screen.getByText(/Big bowl/)).toBeTruthy();
    expect(screen.getByText(/Mini cup/)).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getAllByLabelText('Remove custom portion')[0]);
    });
    expect(screen.queryByText(/Big bowl/)).toBeNull();
    expect(screen.getByText(/Mini cup/)).toBeTruthy();
  });

  it('starts in Weight mode when food has no non-100g portions and opens custom form when clicking Portions', () => {
    const onChange = vi.fn();
    render(<AmountSelector value={100} onChange={onChange} unit="g" food={plainChicken} />);

    expect(document.querySelector('[data-weight-panel]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Portions/ }));
    expect(document.querySelector('[data-custom-portion-form]')).toBeTruthy();
  });
});
