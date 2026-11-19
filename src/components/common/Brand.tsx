import wordmarkSvg from '../../assets/brand/kakcalculator-wordmark.svg?raw';
import iconSvg from '../../assets/brand/kakcalculator-icon.svg?raw';

const INK = '#232325';
const CREAM_PLATE = '<rect width="820" height="260" fill="#FBF3E3" />';
// Verified at build time by scripts/smoke.mjs: the plate must be found and removed.

/*
 * The supplied wordmark, with its cream background plate removed and its ink set to
 * currentColor. The text then takes the colour of the header or theme behind it.
 * The source file is unchanged; this transform runs at build time.
 */
const WORDMARK_MARKUP = wordmarkSvg
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(CREAM_PLATE, '')
  .split(INK)
  .join('currentColor');

const ICON_MARKUP = iconSvg.replace(/<title>[\s\S]*?<\/title>/, '');

interface BrandProps {
  className?: string;
}

/** The full name, for the top of every page. Transparent, so it follows the theme. */
export function Wordmark({ className = '' }: BrandProps) {
  return (
    <span
      role="img"
      aria-label="Kakcalculator"
      className={`kc-wordmark inline-flex items-center text-[var(--text)] [&>svg]:block [&>svg]:h-full [&>svg]:w-auto ${className}`}
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
