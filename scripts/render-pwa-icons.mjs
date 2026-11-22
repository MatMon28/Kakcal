// Regenerates the PWA icons in public/icons/ from the app icon SVG.
//   npm i --no-save sharp && node scripts/generate-icon.mjs && node scripts/render-pwa-icons.mjs
// Output (all PNG):
//   icon-192.png, icon-512.png      "any" purpose: the rounded cream tile as designed
//   maskable-512.png                full-bleed cream square, artwork inside the 80% safe zone
//   apple-touch-icon.png (180)      iOS home screen: full-bleed square (iOS rounds it itself)
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let sharp;
try { sharp = (await import('sharp')).default; }
catch { throw new Error('Run "npm i --no-save sharp" first.'); }

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'public/icons');
await mkdir(out, { recursive: true });

import { APPLE_SCALE, LOGO_CENTRE, MASKABLE_SCALE, PALETTE } from './brand-geometry.mjs';

const BG = PALETTE.light.bg; // the tile colour
const svg = await readFile(path.join(root, 'src/assets/brand/kakcalculator-icon.svg'), 'utf8');
// Inner artwork of the brand SVG (everything after the rounded tile <rect>), reused on a full-bleed square.
const art = svg.replace(/^[\s\S]*?<rect[^>]*\/>/, '').replace('</svg>', '');

/** Full-bleed square (1024 canvas), artwork at `scale` (1 = its size in the tile) and centred. */
const fullBleed = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="512" height="512">
  <rect width="1024" height="1024" fill="${BG}"/>
  <g transform="translate(512 512) scale(${scale}) translate(${-LOGO_CENTRE.x} ${-LOGO_CENTRE.y})">${art}</g>
</svg>`;

const render = async (name, source, size) => {
  await sharp(Buffer.from(source), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(out, name));
  console.log(`public/icons/${name} (${size}x${size})`);
};

await render('icon-192.png', svg, 192);
await render('icon-512.png', svg, 512);
// Maskable: Android may crop to a circle (radius 40% of the side), so keep the artwork well inside it.
await render('maskable-512.png', fullBleed(MASKABLE_SCALE), 512);
await render('apple-touch-icon.png', fullBleed(APPLE_SCALE), 180);
