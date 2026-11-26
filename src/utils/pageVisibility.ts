import type { ActiveTab, MainTabId, Settings } from '../types';

export const DEFAULT_PAGE_ORDER: MainTabId[] = ['today', 'fasting', 'prebuilt', 'period', 'body', 'history'];

const VALID_MAIN_TABS = new Set<MainTabId>(DEFAULT_PAGE_ORDER);

/**
 * Normalises a stored/user-provided page order to contain every main tab once, in order.
 * Invalid entries and duplicates are dropped, and any missing tabs are appended in default order.
 */
export function normalizePageOrder(raw: unknown): MainTabId[] {
  const seen = new Set<MainTabId>();
  const out: MainTabId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && VALID_MAIN_TABS.has(item as MainTabId) && !seen.has(item as MainTabId)) {
        seen.add(item as MainTabId);
        out.push(item as MainTabId);
      }
    }
  }
  for (const tab of DEFAULT_PAGE_ORDER) {
    if (!seen.has(tab)) out.push(tab);
  }
  return out;
}

/**
 * True when Settings > Pages (or the Period switch) hides this tab. Today is never hidden.
 * The Body page is hidden by the advanced body-measurements switch instead (`useAdvanced().body.enabled`),
 * which `App.tsx` checks itself.
 */
export function isPageHiddenBySettings(
  tab: ActiveTab,
  settings: Pick<Settings, 'hidePeriod' | 'hideCustomPage' | 'hideStatisticsPage'>,
): boolean {
  switch (tab) {
    case 'period':
      return settings.hidePeriod;
    case 'prebuilt':
      return settings.hideCustomPage;
    case 'history':
      return settings.hideStatisticsPage;
    default:
      return false;
  }
}
