import type { ActiveTab } from '../types';
import { afterPaint, whenIdle } from './idle';
import { preloadableLazy } from './preloadableLazy';

export const LazyPeriodView = preloadableLazy(() =>
  import('../components/period/PeriodView').then((m) => ({ default: m.PeriodView })),
);
export const LazyHistoryView = preloadableLazy(() =>
  import('../components/history/HistoryView').then((m) => ({ default: m.HistoryView })),
);
export const LazyBodyView = preloadableLazy(() =>
  import('../components/body/BodyView').then((m) => ({ default: m.BodyView })),
);

export const LazyLogActivityModal = preloadableLazy(() =>
  import('../components/modals/LogActivityModal').then((m) => ({ default: m.LogActivityModal })),
);
export const LazyBarcodeLookupModal = preloadableLazy(() =>
  import('../components/modals/BarcodeLookupModal').then((m) => ({ default: m.BarcodeLookupModal })),
);
export const LazyUserProfileModal = preloadableLazy(() =>
  import('../components/modals/UserProfileModal').then((m) => ({ default: m.UserProfileModal })),
);
export const LazySettingsModal = preloadableLazy(() =>
  import('../components/modals/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);
export const LazyPeriodSheet = preloadableLazy(() =>
  import('../components/modals/PeriodSheet').then((m) => ({ default: m.PeriodSheet })),
);
export const LazyAppTour = preloadableLazy(() =>
  import('../components/tour/AppTour').then((m) => ({ default: m.AppTour })),
);

/** Immediately warms the chunk for a lazy main tab (used on tab pointerdown/focus and horizontal swipe lock). */
export function preloadTabScreen(tab: ActiveTab): void {
  switch (tab) {
    case 'period':
      void LazyPeriodView.preload();
      break;
    case 'history':
      void LazyHistoryView.preload();
      break;
    case 'body':
      void LazyBodyView.preload();
      break;
  }
}

/**
 * Staggers optional chunk preloading one item per idle slice after first paint:
 * visible tabs first, then dialogs, skipping hidden pages so unused code stays unloaded.
 */
export function scheduleLazyScreenPreload(opts: {
  periodShown: boolean;
  bodyShown: boolean;
  historyShown: boolean;
}): () => void {
  const queue: Array<() => Promise<void>> = [];
  if (opts.historyShown && !LazyHistoryView.isLoaded()) queue.push(LazyHistoryView.preload);
  if (opts.periodShown && !LazyPeriodView.isLoaded()) queue.push(LazyPeriodView.preload);
  if (opts.bodyShown && !LazyBodyView.isLoaded()) queue.push(LazyBodyView.preload);
  if (!LazySettingsModal.isLoaded()) queue.push(LazySettingsModal.preload);
  if (!LazyLogActivityModal.isLoaded()) queue.push(LazyLogActivityModal.preload);
  if (!LazyUserProfileModal.isLoaded()) queue.push(LazyUserProfileModal.preload);
  if (opts.periodShown && !LazyPeriodSheet.isLoaded()) queue.push(LazyPeriodSheet.preload);

  if (queue.length === 0) return () => undefined;

  let cancelled = false;
  let cancelStep: () => void = () => undefined;
  let idx = 0;

  const runNext = () => {
    if (cancelled || idx >= queue.length) return;
    const load = queue[idx++];
    void load().finally(() => {
      if (!cancelled && idx < queue.length) {
        cancelStep = whenIdle(runNext, 1200);
      }
    });
  };

  const cancelPaint = afterPaint(() => {
    if (!cancelled) cancelStep = whenIdle(runNext, 1200);
  });

  return () => {
    cancelled = true;
    cancelPaint();
    cancelStep();
  };
}
