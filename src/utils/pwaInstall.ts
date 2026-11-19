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

export const isStandaloneApp = () =>
  typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );

export const isIosDevice = () =>
  typeof navigator !== 'undefined' && (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

/** Where the current visitor is most likely installing: the guide opens on that tab. */
export const detectInstallTarget = (): 'ios' | 'android' | 'desktop' => {
  if (typeof navigator === 'undefined') return 'desktop';
  if (isIosDevice()) return 'ios';
  if (/android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
};

const isIos = isIosDevice;

function compute(): PwaInstallState {
  if (typeof window === 'undefined' || isAndroidApp()) return 'hidden';
  if (installed || isStandaloneApp()) return 'installed';
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
    update();
  });
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
  if (outcome === 'accepted') installed = true;
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
