/**
 * Meal-plan links open Kakcal with `#p=...` (short) or `#meal-plan=...` (older links).
 *
 * The link is read ONCE when the app starts and the fragment is removed from the address bar at once. That way
 * no later event (closing Settings, a remount of the Custom page, the Back guard walking through history
 * entries, a hashchange) can ever bring the share/import pop-up back. The pop-up appears only when
 * 1. the app was opened from a link, 2. a link is opened in the already open tab, or 3. the user presses
 * the share icon of the planner.
 */
const MARKERS = ['#p=', '#meal-plan='];

export const isPlanHash = (hash: string) => MARKERS.some((marker) => hash.startsWith(marker));

let pending = '';

/** Moves a plan link from the address bar into memory. Returns true when one was found. */
export function captureIncomingPlan(): boolean {
  if (typeof window === 'undefined' || !isPlanHash(window.location.hash)) return false;
  pending = window.location.href;
  try {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  } catch {
    /* restricted webview: the link stays in memory only */
  }
  return true;
}

/** True when this session was started by opening a plan link (stays true, the fragment is gone by then). */
export const startedWithPlanLink = captureIncomingPlan();

/** The received link that has not been shown yet, or an empty string. */
export const peekIncomingPlan = () => pending;
export const clearIncomingPlan = () => { pending = ''; };
