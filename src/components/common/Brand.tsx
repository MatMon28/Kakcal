import wordmarkSvg from '../../assets/brand/kakcalculator-wordmark.svg?raw';
import iconSvg from '../../assets/brand/kakcalculator-icon.svg?raw';
import './poop-anim.css';

const INK = '#0B0F1E'; // Koink's ink, the colour scripts/outline-wordmark.mjs draws the wordmark in
// The plate is the one `kc-plate` rect that scripts/outline-wordmark.mjs writes first.
const CREAM_PLATE = /<rect class="kc-plate"[^>]*\/>/;
// Verified at build time by scripts/smoke.mjs: the plate must be found and removed.

/*
 * The wordmark (K, poop, "kcal" as Nunito ExtraBold outlines, laid out like the Koink wordmark; see
 * docs/brand.md), with its cream background plate removed and its ink set to currentColor. The
 * letters then take the colour of the header or theme behind it. The source file is unchanged; this
 * transform runs at build time. The wrapping span already is the image, so the svg itself is hidden.
 */
const BASE_WORDMARK = wordmarkSvg
  .replace(/<!--[\s\S]*?-->\s*/, '')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(' role="img" aria-label="Kakcal"', ' aria-hidden="true"')
  .replace(CREAM_PLATE, '')
  .split(INK)
  .join('currentColor');

/*
 * Logo-click animation hooks (poop-anim.css, poopAnimations.ts). The poop is the group that
 * is the `kc-poop-group` group of the wordmark. Its content is wrapped in `.kc-poop` (the first path is the
 * outline, the other three are the tier creases; all get pathLength 100 so they can be drawn
 * with stroke-dashoffset) and three burst ticks are added next to it. Nothing visible changes
 * at rest. If the wordmark file changes shape and the group is not found, the markup is
 * returned untouched and the logo simply does not animate.
 */
const POOP_GROUP = /(<g class="kc-poop-group"[^>]*>)([\s\S]*?)(<\/g>)/;
const POOP_TICKS = [
  'M2 14 L-5 7', // up-left
  'M32 -1 V-10', // up
  'M62 14 L69 7', // up-right
]
  .map((d) => `<path class="kc-poop-tick" pathLength="100" d="${d}" />`)
  .join('');

function markUpPoop(markup: string): string {
  return markup.replace(POOP_GROUP, (_all, open: string, paths: string, close: string) => {
    let index = 0;
    const marked = paths.replace(/<path /g, () => {
      const cls = index++ === 0 ? 'kc-poop-body' : 'kc-poop-crease';
      return `<path class="${cls}" pathLength="100" `;
    });
    return `${open}<g class="kc-poop-ticks">${POOP_TICKS}</g><g class="kc-poop">${marked}</g>${close}`;
  });
}

const WORDMARK_MARKUP = markUpPoop(BASE_WORDMARK);

const ICON_MARKUP = iconSvg.replace(/<title>[\s\S]*?<\/title>/, '');

interface BrandProps {
  className?: string;
}

/** The full name, for the top of every page. No plate; its ink is Koink's brand ink, dark or light with the theme. */
export function Wordmark({ className = '' }: BrandProps) {
  return (
    <span
      role="img"
      aria-label="Kakcal"
      className={`kc-wordmark inline-flex items-center text-[var(--kc-brand-ink)] [&>svg]:block [&>svg]:h-full [&>svg]:w-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: WORDMARK_MARKUP }}
    />
  );
}

/** The app icon, with its own cream tile. Decorative when it sits beside visible text. */
export function AppIcon({ className = '' }: BrandProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-square shrink-0 [&>svg]:block [&>svg]:size-full ${className}`}
      dangerouslySetInnerHTML={{ __html: ICON_MARKUP }}
    />
  );
}
