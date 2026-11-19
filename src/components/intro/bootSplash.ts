/**
 * The boot screen is the full-name logo that index.html paints before any script runs
 * (`#kc-boot`), so the launch is never a blank page. Once the app has mounted, and the launch
 * animation (if any) is already rendered underneath it, it fades out over the animation.
 */
const FADE_MS = 220;

export function dismissBootSplash(): void {
  const boot = document.getElementById('kc-boot');
  if (!boot || boot.hasAttribute('data-hidden')) return;
  // Two frames: let the intro overlay (or the app) paint its first frame under the logo first.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    boot.setAttribute('data-hidden', '');
    window.setTimeout(() => boot.remove(), FADE_MS + 60);
  }));
}
