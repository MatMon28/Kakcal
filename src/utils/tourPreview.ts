/**
 * The guided tour embeds the journal with `?tour=1`. Only that embedded copy shows
 * the Period page whatever the Settings switch says, so the tour can demonstrate it.
 * The stored setting is never changed, and the standalone app behaves as before.
 */
export const IS_TOUR_PREVIEW =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tour') === '1';

export const isPeriodShown = (hidePeriod: boolean) => !hidePeriod || IS_TOUR_PREVIEW;
