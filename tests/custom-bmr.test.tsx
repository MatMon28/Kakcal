import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../src/context/AppContext';
import { UserProfileModal } from '../src/components/modals/UserProfileModal';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import { calculateBMR, calculateMifflinBMR, restingKcalPerHour } from '../src/utils/calculations';
import type { UserProfile } from '../src/types';

const baseProfile: UserProfile = {
  weightKg: 73,
  heightCm: 178,
  age: 29,
  sex: 'male',
};

function ProfileHarness() {
  const { setIsProfileOpen, userProfile, currentExpenditure } = useApp();
  useEffect(() => {
    setIsProfileOpen(true);
  }, [setIsProfileOpen]);
  return (
    <div>
      <span data-testid="bmr-value">{currentExpenditure.bmr}</span>
      <span data-testid="use-custom">{String(Boolean(userProfile.useCustomBmr))}</span>
      <span data-testid="custom-val">{userProfile.customBmrKcal ?? ''}</span>
      <UserProfileModal />
    </div>
  );
}

beforeEach(async () => {
  await deleteDatabase();
  resetDbForTests();
  resetBootForTests();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await flushWrites();
});

describe('personalised daily calorie burned', () => {
  it('uses Mifflin-St Jeor by default and swaps to customBmrKcal when enabled', () => {
    const mifflin = calculateMifflinBMR(baseProfile);
    expect(calculateBMR(baseProfile)).toBe(mifflin);

    const customProfile: UserProfile = {
      ...baseProfile,
      useCustomBmr: true,
      customBmrKcal: 2350,
    };
    expect(calculateBMR(customProfile)).toBe(2350);
    expect(calculateMifflinBMR(customProfile)).toBe(mifflin);
    expect(restingKcalPerHour(customProfile)).toBeCloseTo(mifflin / 24, 5);

    expect(calculateBMR({ ...baseProfile, useCustomBmr: true, customBmrKcal: 0 })).toBe(mifflin);
  });

  it('allows swapping between calculated BMR and personalised daily burn in UserProfileModal', () => {
    render(
      <StrictMode>
        <AppProvider>
          <ProfileHarness />
        </AppProvider>
      </StrictMode>,
    );

    const mifflin = calculateMifflinBMR(baseProfile);
    expect(screen.getByTestId('bmr-value').textContent).toBe(String(mifflin));

    const customTab = screen.getByRole('tab', { name: /personalised/i });
    act(() => {
      fireEvent.click(customTab);
    });

    // Stepper +50
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /increase daily calories/i }));
    });
    const input = screen.getByRole('textbox', { name: /daily calories burned/i }) as HTMLInputElement;
    expect(input.value).toBe(String(mifflin + 50));

    // Reset to BMR
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset to bmr/i }));
    });
    expect(input.value).toBe(String(mifflin));

    // Direct input
    act(() => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '2450' } });
      fireEvent.blur(input);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    });

    expect(screen.getByTestId('use-custom').textContent).toBe('true');
    expect(screen.getByTestId('custom-val').textContent).toBe('2450');
    expect(screen.getByTestId('bmr-value').textContent).toBe('2450');
  });
});
