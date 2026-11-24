import type { ActiveTab, Settings } from '../types';

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
