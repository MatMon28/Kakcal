// Shared geometry of the Kakcal brand: the K, the poop, and where each of them stands in the icon and in the
// wordmark. Used by scripts/generate-icon.mjs (icon SVGs), scripts/outline-wordmark.mjs (wordmark SVGs),
// scripts/generate-notification-icon.mjs, scripts/render-brand.mjs, scripts/render-pwa-icons.mjs and
// scripts/brand-animations.mjs (launch and logo-press animations). Plain numbers only (the one function that
// needs a font gets it as an argument), so this file has no dependency.
//
// The design (explained in docs/brand.md):
//   icon      a SOLID poop (a pointed tip on top of three rounded tiers) in ink on a rounded tile, with the K of
//             the Koink brand carved out of its belly (the K is painted in the tile colour);
//   wordmark  k + the same solid poop (as the first "a", as tall as the ascenders) + "kcal", Nunito Black outlines.
// Colours are Koink's: ink #0B0F1E on #F9F3E6; dark: #F9F3E6 on #070A14.

export const PALETTE = {
  light: { bg: '#F9F3E6', ink: '#0B0F1E' },
  dark: { bg: '#070A14', ink: '#F9F3E6' },
};

/** Icon canvas (1024 x 1024) and the corner radius of its tile. */
export const ICON_SIZE = 1024;
export const TILE_RADIUS = 240;

/** The K in icon units (Koink's STEM, ARM and LEG, copied). */
export const K = {
  stem: { x: 246.5, y: 224.5, width: 121.7, height: 567.6, rx: 54 },
  arm: 'M314.72 530L583.1 249.78A82 82 0 0 1 642.32 224.5L642.43 224.5A47 47 0 0 1 676.07 304.32L455.93 530Z',
  leg: 'M339.08 500L592.42 766.59A82 82 0 0 0 651.86 792.1L657.84 792.1A47 47 0 0 0 692.13 712.96L464.4 470Z',
  bottom: 792.1,
};
/** Centre and height of the K's artwork box (for placing a scaled copy). */
export const K_BOX = { cx: (K.stem.x + 692.13) / 2, cy: (K.stem.y + K.bottom) / 2, h: K.bottom - K.stem.y };
/** The K's stem as a plain path (for places that cannot draw a rounded rect, like Android vectors). */
export function stemPath({ x, y, width, height, rx }) {
  const x2 = x + width, y2 = y + height;
  return `M${x + rx} ${y}H${x2 - rx}A${rx} ${rx} 0 0 1 ${x2} ${y + rx}V${y2 - rx}A${rx} ${rx} 0 0 1 ${x2 - rx} ${y2}H${x + rx}A${rx} ${rx} 0 0 1 ${x} ${y2 - rx}V${y + rx}A${rx} ${rx} 0 0 1 ${x + rx} ${y}Z`;
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * The poop in its own 64-unit box: a pointed tip and three rounded tiers (pills), bottom tier first.
 * `box` is the ink's outline (the tip reaches y 2.5, the bottom tier ends at y 59); `SILHOUETTE` is the
 * box used to size it as a letter (taller than the ink by one unit on top, as in the approved design).
 */
export const POOP = {
  tip: 'M32 2.5C34 7 40 8.5 40 14.5H24C24 8.5 30 7 32 2.5Z',
  tiers: [
    { id: 't3', x: 5, y: 38, width: 54, height: 21, rx: 10.5 },
    { id: 't2', x: 13, y: 24, width: 38, height: 20, rx: 10 },
    { id: 't1', x: 21, y: 11, width: 22, height: 18, rx: 9 },
  ],
  box: { x1: 5, x2: 59, y1: 2.5, y2: 59 },
};
export const SILHOUETTE = { w: 54, h: 57.5, x0: 5, y2: 59 };

/** SVG of the plain poop (no wrapper, colour comes from the parent's fill). */
export function poopShapes() {
  return `<path d="${POOP.tip}"/>` + POOP.tiers.map((t) => `<rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" rx="${t.rx}"/>`).join('');
}
/** The same, with the parts wrapped in classed groups so animations can move them. `prefix` is a class prefix. */
export function poopParts(prefix = '') {
  const g = (cls, inner) => `<g class="${prefix}m ${prefix}${cls}">${inner}</g>`;
  return POOP.tiers.map((t) => g(t.id, `<rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" rx="${t.rx}"/>`)).join('') + g('tip', `<path d="${POOP.tip}"/>`);
}

/* ---------- Icon ---------- */
export const ICON = {
  // The artwork is laid out in a 1000 box and scaled about its centre into the tile.
  art: { scale: 0.84, pivot: 500 },
  poop: { x: 0.8, y: 29.2, scale: 15.6 },
  // The K carved out of the poop's belly: centre and height in the 1000 box.
  k: { cx: 500, cy: 662, h: 318 },
};
ICON.artTransform = `translate(${ICON_SIZE / 2} ${ICON_SIZE / 2}) scale(${ICON.art.scale}) translate(-${ICON.art.pivot} -${ICON.art.pivot})`;
ICON.poopTransform = `translate(${ICON.poop.x} ${ICON.poop.y}) scale(${ICON.poop.scale})`;
{
  const s = ICON.k.h / K_BOX.h;
  ICON.kScale = Math.round(s * 100000) / 100000;
  ICON.kTransform = `translate(${ICON.k.cx} ${ICON.k.cy}) scale(${ICON.kScale}) translate(${-r2(K_BOX.cx)} ${-r2(K_BOX.cy)})`;
}
/** Outer box of the poop in icon units (after the 0.84 scale) and its centre: where the artwork is centred. */
{
  const a = ICON.art, p = ICON.poop;
  const map = (v) => ICON_SIZE / 2 + (v - a.pivot) * a.scale;
  const left = map(p.x + POOP.box.x1 * p.scale), right = map(p.x + POOP.box.x2 * p.scale);
  const top = map(p.y + POOP.box.y1 * p.scale), bottom = map(p.y + POOP.box.y2 * p.scale);
  ICON.box = { left, right, top, bottom, width: right - left, height: bottom - top };
}
export const LOGO_CENTRE = { x: r2((ICON.box.left + ICON.box.right) / 2), y: r2((ICON.box.top + ICON.box.bottom) / 2) };

/** Scales of the artwork on the derived images (the poop's rounded corners reach 455 icon units from the centre). */
export const ADAPTIVE_SCALE = 0.072; // dp per icon unit on the 108 dp adaptive layer: stays inside the 66 dp safe circle
export const ROUND_SCALE = 0.9; // round launcher icon (circle of radius 512)
export const MASKABLE_SCALE = 0.88; // PWA maskable icon: inside the 80 % safe circle
export const APPLE_SCALE = 1; // iOS rounds the full-bleed square itself

/** The icon's artwork (poop + carved K) in icon units, for any ink and tile colour (also `var(...)`). */
export function iconArtwork({ ink, bg }) {
  const k = `<g class="kc-k" transform="${ICON.kTransform}" fill="${bg}"><rect x="${K.stem.x}" y="${K.stem.y}" width="${K.stem.width}" height="${K.stem.height}" rx="${K.stem.rx}"/><path d="${K.arm}"/><path d="${K.leg}"/></g>`;
  return `<g class="kc-art" transform="${ICON.artTransform}"><g class="kc-poop-art" transform="${ICON.poopTransform}" fill="${ink}">${poopShapes()}</g>${k}</g>`;
}

/* ---------- Wordmark ---------- */
export const WORDMARK = {
  ascender: 108, // height of the "k" (the lowercase ascender)
  baseline: 122,
  height: 150, // view box height
  left: 6,
  gapAfterK: 0.035, // of the font size
  poopHeight: 1.02, // of the ascender: the poop is as tall as the k and the l
  right: 8,
};

/** Outline of one glyph run, with the positions of every letter. */
function letters(font, str, size, x, y) {
  const u = size / font.unitsPerEm;
  let pen = x, prev = null;
  const list = [];
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (prev) { try { const k = font.getKerningValue(prev, g) * u; if (Number.isFinite(k)) pen += k; } catch { /* no kerning for this pair */ } }
    const p = g.getPath(pen, y, size);
    const d = p.commands.map((c) => (c.type === 'Z' ? 'Z' : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter((v) => v !== undefined).map((v) => r2(Number.isFinite(v) ? v : 0)).join(' '))).join('');
    list.push({ d, x0: pen });
    pen += g.advanceWidth * u;
    prev = g;
  }
  return { list, end: pen };
}

/**
 * Lays the wordmark out for an opentype.js font (Nunito Black): "k", the poop standing on the baseline like an
 * "a" (its flat base on the bottom of the "a"), then "kcal". All numbers are in the 509 x 150 view box.
 */
export function layoutWordmark(font) {
  const W = WORDMARK;
  const size = W.ascender / (font.charToGlyph('k').getBoundingBox().y2 / font.unitsPerEm);
  const aBottom = (font.charToGlyph('a').getBoundingBox().y1 * size) / font.unitsPerEm;
  const scale = (W.ascender * W.poopHeight) / SILHOUETTE.h;
  const first = letters(font, 'k', size, W.left, W.baseline);
  const px = first.end + size * W.gapAfterK;
  const poop = {
    x: r2(px - SILHOUETTE.x0 * scale),
    y: r2(W.baseline - aBottom - SILHOUETTE.y2 * scale),
    scale: r2(scale),
    rawScale: scale,
    width: SILHOUETTE.w * scale,
  };
  const rest = letters(font, 'kcal', size, px + poop.width, W.baseline);
  return { size, first, rest, poop, px, width: Math.ceil(rest.end + W.right), height: W.height };
}
