import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PAGE_ORDER, normalizePageOrder } from '../src/utils/pageVisibility';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    configurable: true,
  });
});

const updateSettings = vi.fn();
let mockPageOrder = [...DEFAULT_PAGE_ORDER];

vi.mock('../src/context/AppContext', () => ({
  useApp: () => ({
    t: {
      nav: { today: 'Today', prebuilt: 'Custom', history: 'Statistics', period: 'Period', body: 'Body', database: 'Foods' },
      settings: { trackPeriod: 'Track period' },
    },
    settings: {
      theme: 'light',
      themeStyle: 'classic',
      ultraMinimal: false,
      hideCustomPage: false,
      hideStatisticsPage: false,
      hidePeriod: false,
      pageOrder: mockPageOrder,
    },
    updateSettings,
    setIsSettingsOpen: vi.fn(),
    setIsProfileOpen: vi.fn(),
  }),
  useShell: () => ({
    t: {
      nav: { today: 'Today', prebuilt: 'Custom', history: 'Statistics', period: 'Period', body: 'Body', database: 'Foods' },
    },
    settings: {
      ultraMinimal: false,
      hideCustomPage: false,
      hideStatisticsPage: false,
      hidePeriod: false,
      pageOrder: mockPageOrder,
    },
  }),
  useNav: () => ({ activeTab: 'today' }),
  useNavActions: () => ({ setActiveTab: vi.fn() }),
}));

vi.mock('../src/utils/advancedStore', () => ({
  setBodyEnabled: vi.fn(),
  useAdvanced: () => ({ body: { enabled: true } }),
}));

vi.mock('../src/utils/fastingStore', () => ({
  setFastingEnabled: vi.fn(),
  useFasting: () => ({ config: { enabled: false } }),
}));

vi.mock('../src/i18n/fasting', () => ({
  useFastingText: () => ({
    pageTitle: 'Fasting',
    pageDesc: 'Fast timer, eating window, notes and history.',
  }),
}));

vi.mock('../src/i18n/journal', () => ({
  useJournalText: () => (en: string) => en,
}));

vi.mock('../src/i18n/advanced', () => ({
  useAdvancedText: () => ({
    settings: { bodyTitle: 'Body measurements', bodyProfileHint: 'Configure body measurements' },
  }),
}));

import { PagesSettings } from '../src/components/modals/settings/PagesSettings';
import { Tabs } from '../src/components/common/Tabs';

afterEach(() => {
  cleanup();
  mockPageOrder = [...DEFAULT_PAGE_ORDER];
  updateSettings.mockReset();
});

describe('Page order settings & navigation', () => {
  it('normalizePageOrder keeps valid unique order and appends missing tabs', () => {
    expect(normalizePageOrder(undefined)).toEqual(DEFAULT_PAGE_ORDER);
    expect(normalizePageOrder(['history', 'today', 'history', 'invalid'])).toEqual([
      'history', 'today', 'fasting', 'prebuilt', 'period', 'body',
    ]);
  });

  it('reorders pages including Today in Settings > Pages and offers Reset', () => {
    const view = render(<PagesSettings />);
    expect(screen.queryByRole('button', { name: /Reset page order/i })).toBeNull();

    // Move Today down from index 0 -> index 1
    fireEvent.click(screen.getByRole('button', { name: /Move Today down/i }));
    expect(updateSettings).toHaveBeenCalledWith({
      pageOrder: ['fasting', 'today', 'prebuilt', 'period', 'body', 'history'],
    });

    // Move Statistics up from index 5 -> index 4
    fireEvent.click(screen.getByRole('button', { name: /Move Statistics up/i }));
    expect(updateSettings).toHaveBeenCalledWith({
      pageOrder: ['today', 'fasting', 'prebuilt', 'period', 'history', 'body'],
    });

    mockPageOrder = ['history', 'today', 'fasting', 'prebuilt', 'period', 'body'];
    view.rerender(<PagesSettings />);
    fireEvent.click(screen.getByRole('button', { name: /Reset page order/i }));
    expect(updateSettings).toHaveBeenCalledWith({ pageOrder: DEFAULT_PAGE_ORDER });
  });

  it('renders Tabs in the configured pageOrder', () => {
    mockPageOrder = ['history', 'period', 'today', 'body', 'prebuilt'];
    render(<Tabs />);
    const buttons = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Statistics', 'Period', 'Today', 'Body', 'Custom']);
  });
});
