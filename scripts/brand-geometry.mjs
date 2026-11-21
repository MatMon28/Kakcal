// Shared geometry of the Kakcal brand: the K, the poop, and where the poop stands.
// Used by scripts/outline-wordmark.mjs (wordmark), scripts/generate-icon.mjs (icon SVGs) and
// scripts/generate-notification-icon.mjs. Plain numbers only, no dependency.
//
// Everything is copied or derived from the Koink brand (github.com/MatMon28/Koink, src/brand/art.js):
// the same K, the same palette, and the poop placed, sized and drawn with the same line weight as
// the pig. Nothing here is typed in by eye: the poop's numbers come from the pig's.
// Explained in docs/brand.md > Koink-style wordmark and Koink-style icon.

/** Koink's two palettes, exactly (`PALETTE` in Koink's art.js). `coin` is unused: the poop has no coin. */
export const PALETTE = {
  light: { bg: '#F9F3E6', ink: '#0B0F1E' },
  dark: { bg: '#070A14', ink: '#F9F3E6' },
};

/** Koink's icon: 1024 x 1024 canvas, rounded tile. */
export const ICON_SIZE = 1024;
export const TILE_RADIUS = 240;
/** Koink's LOGO_BOX: K + pig (here K + poop) inside the icon canvas; the poop has the pig's width. */
export const LOGO_BOX = { x: 246.5, y: 224.5, width: 579, height: 567.6 };
export const LOGO_CENTRE = { x: LOGO_BOX.x + LOGO_BOX.width / 2, y: LOGO_BOX.y + LOGO_BOX.height / 2 };

/** The K in icon units: Koink's STEM, ARM and LEG (`roundedPolygon` output, copied). */
export const K = {
  stem: { x: 246.5, y: 224.5, width: 121.7, height: 567.6, rx: 54 },
  arm: 'M314.72 530L583.1 249.78A82 82 0 0 1 642.32 224.5L642.43 224.5A47 47 0 0 1 676.07 304.32L455.93 530Z',
  leg: 'M339.08 500L592.42 766.59A82 82 0 0 0 651.86 792.1L657.84 792.1A47 47 0 0 0 692.13 712.96L464.4 470Z',
  bottom: 792.1,
};
/** The K's stem as a plain path (for places that cannot draw a rounded rect, like Android vectors). */
export function stemPath({ x, y, width, height, rx }) {
  const x2 = x + width, y2 = y + height;
  return `M${x + rx} ${y}H${x2 - rx}A${rx} ${rx} 0 0 1 ${x2} ${y + rx}V${y2 - rx}A${rx} ${rx} 0 0 1 ${x2 - rx} ${y2}H${x + rx}A${rx} ${rx} 0 0 1 ${x} ${y2 - rx}V${y + rx}A${rx} ${rx} 0 0 1 ${x + rx} ${y}Z`;
}

/** Koink's pig in icon units: only what the poop has to match (head, ears, line weight). */
export const PIG = {
  axis: 682.6, headCy: 646, headR: 129.7, earBaseX: 569, earApexY: 459.7,
  iconStroke: 26, // the icon's line weight
  wordmarkStroke: 26 * 0.885, // the wordmark's pig has slightly lighter lines (x 0.885)
  haloStroke: 81, // width of the background-coloured outline that clears the K around the pig
};

/** The poop: a 64-unit box, tiers between x 8-56 and y 5-56; the first path is the outline, then three creases. */
export const POOP = {
  box: { x1: 8, x2: 56, y1: 5, y2: 56 },
  body: 'M32 5 C37 9 39 12.5 36.5 15.5 C41 16 44 18.5 44 22.5 C44 25 43 27 42 28 C46.5 28.5 50 31.5 50 35 C50 37.5 49 39.5 48 41 C52.5 41.5 56 44.5 56 48 C56 52.5 52.5 56 48 56 H16 C11.5 56 8 52.5 8 48 C8 44.5 11.5 41.5 16 41 C15 39.5 14 37.5 14 35 C14 31.5 17.5 28.5 22 28 C21 27 20 25 20 22.5 C20 18.5 23 16 27.5 15.5 C25 12.5 27 9 32 5Z',
  creases: ['M27.5 15.5 Q32 18 36.5 15.5', 'M22 28 Q32 31.5 42 28', 'M16 41 Q32 45.5 48 41'],
};
POOP.d = [POOP.body, ...POOP.creases];

const r2 = (v) => Math.round(v * 100) / 100;

/** The pig's outer box (including its line) in the units of a layout: `s` scale, `tx`, `ty` offset, `stroke` weight in icon units. */
function pigBox({ s, tx, ty, stroke }) {
  const left = Math.min(PIG.earBaseX, PIG.axis - PIG.headR) - stroke / 2;
  return {
    left: tx + left * s,
    right: tx + (2 * PIG.axis - Math.min(PIG.earBaseX, PIG.axis - PIG.headR) + stroke / 2) * s,
    top: ty + (PIG.earApexY - stroke / 2) * s,
    bottom: ty + (PIG.headCy + PIG.headR + stroke / 2) * s,
    stroke: stroke * s,
  };
}

/**
 * Where the poop goes, given the pig's outer box and the line weight to use: same left and right edge
 * (so same width and same gaps), same line weight, flat base on `bottom`. Returns the poop group's
 * transform and its line weight in its own units.
 */
function poopLike(box, bottom) {
  const scale = (box.right - box.left - box.stroke) / (POOP.box.x2 - POOP.box.x1);
  return {
    scale: Math.round(scale * 1000) / 1000,
    strokeWidth: r2((box.stroke / scale) * 100) / 100,
    x: r2(box.left + box.stroke / 2 - POOP.box.x1 * scale),
    y: r2(bottom - box.stroke / 2 - POOP.box.y2 * scale),
    right: box.right,
    top: bottom - (POOP.box.y2 - POOP.box.y1) * scale - box.stroke,
  };
}

/* ---------- Wordmark (Koink: translate(-23.24 -89.45) scale(0.3462), K at translate(8.94 19.44) scale(0.20374)) ---------- */
export const WORDMARK = {
  k: { transform: 'translate(8.94 19.44) scale(0.20374)', scale: 0.20374, tx: 8.94, ty: 19.44 },
  pigLayout: { s: 0.3462, tx: -23.24, ty: -89.45 },
  bottom: 180.9, // bottom edge of the K and of the ink of Koink's "ink"
  textBaseline: 179.62, // = bottom minus the 1.38 that Nunito's round stems reach below the baseline at 160.5
  fontSize: 160.5, // Koink extracted "ink" at this size
  gapToLetters: 14, // pig's right edge (262) to the "i" (276) in Koink
};
WORDMARK.pig = pigBox({ ...WORDMARK.pigLayout, stroke: PIG.wordmarkStroke });
WORDMARK.poop = poopLike(WORDMARK.pig, WORDMARK.bottom);

/* ---------- Icon (Koink: pig drawn directly in icon units, line weight 26) ---------- */
export const ICON = {};
ICON.pig = pigBox({ s: 1, tx: 0, ty: 0, stroke: PIG.iconStroke });
// The pig's lowest point is its head; the poop's flat base takes the same place.
ICON.poop = poopLike(ICON.pig, ICON.pig.bottom);
/** Halo width in the poop's own units. */
ICON.haloLocal = r2(PIG.haloStroke / ICON.poop.scale);

/** The poop as SVG: the group that places it, with the body filled by `fill` and lines drawn in `ink`. */
export function poopGroup({ layout, ink, fill = 'none', cls = '', halo }) {
  const c = cls ? ` class="${cls}"` : '';
  return (
    (halo ? `<g transform="translate(${layout.x} ${layout.y}) scale(${layout.scale})" fill="${halo.color}" stroke="${halo.color}" stroke-width="${halo.width}" stroke-linejoin="round" stroke-linecap="round"><path d="${POOP.body}"/></g>` : '') +
    `<g${c} transform="translate(${layout.x} ${layout.y}) scale(${layout.scale})" fill="none" stroke="${ink}" stroke-width="${layout.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${POOP.body}"${fill === 'none' ? '' : ` fill="${fill}"`}/>${POOP.creases.map((d) => `<path d="${d}"/>`).join('')}</g>`
  );
}
