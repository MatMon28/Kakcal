import { useSyncExternalStore } from 'react';
import { isAndroidApp } from './android';

/**
 * PWA install state. `beforeinstallprompt` fires once, early (often before Settings is ever opened),
 * so it is captured at startup by `initPwaInstall()` (called from main.tsx) and kept here.
 * Nothing is stored on disk and nothing is sent anywhere.
 */
export type PwaInstallState = 'hidden' | 'available' | 'ios' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let started = false;
let snapshot: PwaInstallState = 'hidden';
const listeners = new Set<() => void>();

/** Remembers on this browser profile that the PWA was installed or opened as an app (see `shouldOpenJournal`). */
const INSTALLED_KEY = 'kc_pwa_installed';

/** True when the page runs as an installed app (own window / home-screen icon), not in a browser tab. */
export const isStandalone = () =>
  ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(
    (mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches,
  ) || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export type InstallPlatform = 'ios' | 'android' | 'desktop';

/** The device family, used to pick the matching install instructions. */
export function detectPlatform(): InstallPlatform {
  if (isIos()) return 'ios';
  if (/android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

function rememberInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* storage unavailable */ }
}

/**
 * Decides whether the page should open the journal instead of the explanation/installation page.
 * Inside an installed app this is always true. In a normal browser tab it stays true on a device where
 * the app was installed before (same browser profile), so the guide only appears for new visitors.
 * An explicit `?view=tour` still shows the guide in a browser tab.
 */
export function shouldOpenJournal(view: string | null): boolean {
  if (typeof window === 'undefined') return false;
  if (isStandalone()) { rememberInstalled(); return true; }
  if (view === 'tour') return false;
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch { return false; }
}

function compute(): PwaInstallState {
  if (typeof window === 'undefined' || isAndroidApp()) return 'hidden';
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'available';
  // iOS Safari never fires beforeinstallprompt; the user has to use Share > Add to Home Screen.
  if (isIos() && window.isSecureContext) return 'ios';
  return 'hidden';
}

function update() {
  const next = compute();
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** Starts listening for install events. Safe to call more than once. */
export function initPwaInstall() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // keep the browser's mini-infobar quiet; Settings offers the button instead
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    rememberInstalled();
    update();
  });
  if (isStandalone()) rememberInstalled();
  snapshot = compute();
}

/** Shows the browser's install dialog. Resolves to true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // a prompt event can only be used once
  update();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') { installed = true; rememberInstalled(); }
  update();
  return outcome === 'accepted';
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function usePwaInstallState(): PwaInstallState {
  return useSyncExternalStore(subscribe, () => snapshot, () => 'hidden' as PwaInstallState);
}
