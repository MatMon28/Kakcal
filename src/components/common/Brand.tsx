import wordmarkSvg from '../../assets/brand/kakcalculator-wordmark.svg?raw';
import iconSvg from '../../assets/brand/kakcalculator-icon.svg?raw';
import './poop-anim.css';

const INK = '#0B0F1E'; // the brand ink, the colour scripts/outline-wordmark.mjs draws the wordmark in
// The plate is the one `kc-plate` rect that scripts/outline-wordmark.mjs writes first.
const CREAM_PLATE = /<rect class="kc-plate"[^>]*\/>/;
// Verified at build time by scripts/smoke.mjs: the plate must be found and removed.

/*
 * The wordmark ("k", the solid poop, "kcal" as Nunito Black outlines; see
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
 * Logo-click animation hooks (poop-anim.css, poopAnimations.ts). scripts/outline-wordmark.mjs already marks the poop
 * of the wordmark: `.kc-poop-group` > `.kc-poop` > `.kc-t3`, `.kc-t2`, `.kc-t1`, `.kc-tip` (the three tiers and the tip).
 * Only the three burst ticks of the "press" animation are added here (hidden at rest, drawn with stroke-dashoffset), so
 * the file on disk stays the plain logo. Nothing visible changes at rest. If the wordmark file changes shape and the poop is
 * not found, the markup is returned untouched and the logo simply does not animate (scripts/smoke.mjs checks this).
 */
const POOP_MARK = '<g class="kc-m kc-poop">';
const POOP_TICKS =
  '<g class="kc-poop-ticks">' +
  ['M17 9 L10.5 3', 'M32 -1.5 L32 -9', 'M47 9 L53.5 3']
    .map((d) => `<path class="kc-m kc-tick" pathLength="100" d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />`)
    .join('') +
  '</g>';

const WORDMARK_MARKUP = BASE_WORDMARK.replace(POOP_MARK, POOP_TICKS + POOP_MARK);

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

/** The app icon (solid poop, carved K), with its own cream tile. Decorative when it sits beside visible text. */
export function AppIcon({ className = '' }: BrandProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-square shrink-0 [&>svg]:block [&>svg]:size-full ${className}`}
      dangerouslySetInnerHTML={{ __html: ICON_MARKUP }}
    />
  );
}
