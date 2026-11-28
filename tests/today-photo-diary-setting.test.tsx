import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const updateSettings = vi.fn();
let mockSettings = {
  quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true },
  hidePoop: false,
  trackSugar: false,
  inlineMealNotes: true,
  photoDiary: false,
  photoDiaryInToday: false,
  quickFoods: ['f1'],
  customButtons: [],
  widgetCustomButton: false,
};

const labels = new Proxy({}, { get: () => 'label' });
const base = {
  common: { back: 'Back', clear: 'Clear' },
  quickAdd: { food: 'Food', movement: 'Movement', weight: 'Weight', custom: 'Custom' },
  settings: { quickFoodsLabel: 'Quick foods', customButtons: 'Custom buttons' },
  foodModal: { typeToSearch: 'Search', minCharsHint: 'Type 2 chars', noResults: 'None' },
};
const t: unknown = new Proxy(base, { get: (target, key: string) => (key in target ? (target as Record<string, unknown>)[key] : labels) });

vi.mock('../src/context/AppContext', () => ({
  useApp: () => ({
    t,
    settings: mockSettings,
    updateSettings,
    language: 'en',
    allFoods: [],
    rememberFood: () => {},
  }),
  useSettings: () => ({ t, settings: mockSettings, updateSettings, language: 'en' }),
  useJournalData: () => ({ allFoods: [], rememberFood: () => {} }),
  useNavActions: () => ({ setActiveTab: () => {} }),
  useUiState: () => ({ selectedDate: '2099-03-02' }),
}));
vi.mock('../src/utils/useCatalogueSearch', () => ({ useCatalogueSearch: () => ({ foods: [], pending: false }) }));
vi.mock('../src/utils/journalStore', () => ({
  addMealPhoto: vi.fn(),
  journalId: () => 'id',
  removeMealPhoto: vi.fn(),
  saveMealPhoto: vi.fn(),
  useMealJournal: () => ({ photos: [] }),
  usePhotosForLinked: () => [],
  usePhotosForSlot: () => [],
}));
vi.mock('../src/components/modals/settings/CustomButtonsSettings', () => ({
  CustomButtonsSettings: () => <div data-testid="custom-buttons" />,
}));

import { TodaySettings } from '../src/components/modals/settings/TodaySettings';
import { CustomPageSettings } from '../src/components/modals/settings/CustomPageSettings';
import { MealPhotoAction } from '../src/components/journal/PhotoDiary';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  updateSettings.mockReset();
});

describe('Settings > Today: Photo diary in Today', () => {
  it('places Photo diary in Today right below Meal notes in Today and updates photoDiaryInToday', () => {
    render(<TodaySettings />);
    const mealNotes = screen.getByRole('switch', { name: /Meal notes in Today/i });
    const photoDiary = screen.getByRole('switch', { name: /Photo diary in Today/i });
    expect(mealNotes.compareDocumentPosition(photoDiary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(photoDiary);
    expect(updateSettings).toHaveBeenCalledWith({ photoDiaryInToday: true });
  });

  it('gates Today meal photo action on photoDiaryInToday independently of photoDiary', () => {
    mockSettings = { ...mockSettings, photoDiary: true, photoDiaryInToday: false };
    const view = render(<MealPhotoAction date="2099-03-02" slot="lunch" />);
    expect(screen.queryByRole('button', { name: /Photograph this meal/i })).toBeNull();

    mockSettings = { ...mockSettings, photoDiary: false, photoDiaryInToday: true };
    view.rerender(<MealPhotoAction date="2099-03-02" slot="lunch" />);
    expect(screen.getByRole('button', { name: /Photograph this meal/i })).toBeTruthy();
  });

  it('removes the Photo diary master toggle from Custom page settings and keeps button/section independent', () => {
    mockSettings = {
      ...mockSettings,
      photoDiary: false,
      showPhotoButton: true,
      hideCustomButtons: {},
      hideCustomFields: {},
      showPlannerButton: true,
    } as typeof mockSettings;
    render(<CustomPageSettings />);
    expect(screen.queryByText('Features')).toBeNull();
    const photoButtonSwitch = screen.getByRole('switch', { name: 'Photo diary button' }) as HTMLButtonElement;
    const photoSectionSwitch = screen.getByRole('switch', { name: 'Photo diary' }) as HTMLButtonElement;
    expect(photoButtonSwitch.disabled).toBe(false);
    expect(photoButtonSwitch.getAttribute('aria-checked')).toBe('true');
    expect(photoSectionSwitch.disabled).toBe(false);
    expect(photoSectionSwitch.getAttribute('aria-checked')).toBe('true');
  });
});
