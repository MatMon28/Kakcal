#!/usr/bin/env node
// Renders the chamfered ("angular" theme style) tray behind the Small and Extra-small widgets as
// density-specific 9-patch PNGs, because a <shape> drawable cannot draw chamfered corners:
//
//   android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/widget_tray_angular.9.png
//   android/app/src/main/res/drawable-{...}/widget_tray_angular_dark.9.png
//
// Colours and the 1 dp dark outline mirror widget_tray.xml / widget_tray_dark.xml. The chamfer is
// concentric with the buttons' (9.45 dp at 48 dp, 26/132 of the button) plus the 4 dp tray padding:
// 9.45 + 4 * (2 - sqrt 2) = 11.8 -> 12 dp. Padding (4 dp) is baked into the 9-patch, because
// RemoteViews.setInt(setBackgroundResource) replaces the layout's padding with the drawable's.
// No dependencies:  node scripts/render-widget-tray.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const res = path.join(root, 'android/app/src/main/res');

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const CUT_DP = 12; // chamfer leg of the tray
const CAP_DP = 14; // fixed (non-stretch) corner size, > chamfer
const SIZE_DP = 40; // artwork size before stretching
const PAD_DP = 4; // tray padding (the buttons sit 4 dp from the edge)
const STYLES = {
  widget_tray_angular: { fill: [0xff, 0xff, 0xfa, 0x7a], stroke: null },
  widget_tray_angular_dark: { fill: [0x12, 0x15, 0x1b, 0xa6], stroke: [0xff, 0xff, 0xff, 0x26] },
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
function png(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Point-in-chamfered-rectangle test (all four corners cut by `cut`), rectangle inset by `inset`. */
function inside(x, y, size, cut, inset) {
  const lo = inset;
  const hi = size - inset;
  if (x < lo || x > hi || y < lo || y > hi) return false;
  return (x - lo) + (y - lo) >= cut && (hi - x) + (y - lo) >= cut &&
    (x - lo) + (hi - y) >= cut && (hi - x) + (hi - y) >= cut;
}

function render(scale, style) {
  const size = Math.round(SIZE_DP * scale);
  const cut = CUT_DP * scale;
  const stroke = scale; // 1 dp
  const innerCut = Math.max(0, cut - stroke * (2 - Math.SQRT2));
  const cap = Math.round(CAP_DP * scale);
  const pad = Math.round(PAD_DP * scale);
  const W = size + 2;
  const pixels = Buffer.alloc(W * W * 4); // fully transparent
  const N = 8; // N x N samples per pixel

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const x = px + (sx + 0.5) / N;
          const y = py + (sy + 0.5) / N;
          if (!inside(x, y, size, cut, 0)) continue;
          let [cr, cg, cb, ca] = style.fill.map((v, i) => (i < 3 ? v : v / 255));
          if (style.stroke && !inside(x, y, size, innerCut, stroke)) {
            const sa = style.stroke[3] / 255;
            const oa = sa + ca * (1 - sa);
            cr = (style.stroke[0] * sa + cr * ca * (1 - sa)) / oa;
            cg = (style.stroke[1] * sa + cg * ca * (1 - sa)) / oa;
            cb = (style.stroke[2] * sa + cb * ca * (1 - sa)) / oa;
            ca = oa;
          }
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca; // premultiplied
        }
      }
      const o = ((py + 1) * W + (px + 1)) * 4;
      if (a > 0) {
        pixels[o] = Math.round(r / a);
        pixels[o + 1] = Math.round(g / a);
        pixels[o + 2] = Math.round(b / a);
        pixels[o + 3] = Math.round((a / (N * N)) * 255);
      }
    }
  }

  const black = (x, y) => pixels.set([0, 0, 0, 255], (y * W + x) * 4);
  // Top / left: the stretchable middle (image coordinates include the 1 px marker border).
  for (let i = cap + 1; i <= size - cap; i++) { black(i, 0); black(0, i); }
  // Bottom / right: the content (padding) area.
  for (let i = pad + 1; i <= size - pad; i++) { black(i, W - 1); black(W - 1, i); }
  return png(W, W, pixels);
}

for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = path.join(res, `drawable-${density}`);
  await mkdir(dir, { recursive: true });
  for (const [name, style] of Object.entries(STYLES)) {
    await writeFile(path.join(dir, `${name}.9.png`), render(scale, style));
  }
}
console.log(`wrote ${Object.keys(DENSITIES).length * Object.keys(STYLES).length} 9-patch files`);
