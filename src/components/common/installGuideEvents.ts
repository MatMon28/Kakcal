/**
 * The tiny, always-loaded half of the install guide: the open event and its types. The heavy dialog
 * (`InstallGuide.tsx`) is loaded on demand by `LazyInstallGuideHost.tsx`, so everything that only needs to
 * *open* the guide imports from here and never pulls the dialog into the main bundle (item 2).
 */
export type GuideLanguage = 'en' | 'it';
export type InstallTarget = 'ios' | 'android' | 'desktop';
export type OpenDetail = { target?: InstallTarget; lang?: GuideLanguage };

export const OPEN_INSTALL_GUIDE = 'kc:open-install-guide';

/** Opens the install guide from anywhere (tour header, Settings card, platform chips). */
export function openInstallGuide(target?: InstallTarget, lang?: GuideLanguage) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_INSTALL_GUIDE, { detail: { target, lang } }));
}

export function detectInstallTarget(): InstallTarget {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
