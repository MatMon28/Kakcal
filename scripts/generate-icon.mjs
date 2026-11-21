#!/usr/bin/env node
// Writes the Kakcal app icon SVGs, drawn like the Koink icon (github.com/MatMon28/Koink, src/brand/art.js):
// 1024 x 1024 canvas, rounded tile (radius 240), Koink's K, and the poop where Koink's pig is: same
// left and right edge, same line weight (26), same halo that clears the K around it. Koink's exact colours.
//
//   src/assets/brand/kakcalculator-icon.svg                              light tile (source of every PNG)
//   src/assets/kakcalculator_intro/logos/kakcalculator-icon{,-inverted,-theme-aware}.svg
//
// Run it before the PNG scripts (they read the first file):
//   node scripts/generate-icon.mjs && node scripts/render-brand.mjs && node scripts/render-pwa-icons.mjs
// No dependency. Geometry: scripts/brand-geometry.mjs. Explained in docs/brand.md > Koink-style icon.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ICON, ICON_SIZE, K, PALETTE, PIG, TILE_RADIUS, poopGroup } from './brand-geometry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/** The artwork (K, halo, poop) in icon units, for any ink and tile colour (also `var(...)`). */
export function artwork({ ink, bg }) {
  return (
    `<g class="kc-k" fill="${ink}"><rect x="${K.stem.x}" y="${K.stem.y}" width="${K.stem.width}" height="${K.stem.height}" rx="${K.stem.rx}"/>` +
    `<path d="${K.arm}"/><path d="${K.leg}"/></g>` +
    poopGroup({ layout: ICON.poop, ink, fill: bg, cls: 'kc-poop-art', halo: { color: bg, width: ICON.haloLocal } })
  );
}

const icon = ({ title, bg, ink, label }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="512" height="512"${label ? ` role="img" aria-label="${label}"` : ''}>` +
  `<title>${title}</title><rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${TILE_RADIUS}" fill="${bg}"/>${artwork({ ink, bg })}</svg>\n`;

const write = (file, text) => writeFile(path.join(root, file), text);
const light = PALETTE.light;
const dark = PALETTE.dark;
await write('src/assets/brand/kakcalculator-icon.svg', icon({ title: 'Kakcal icon', bg: light.bg, ink: light.ink }));
const logos = 'src/assets/kakcalculator_intro/logos/';
await write(`${logos}kakcalculator-icon.svg`, icon({ title: 'Kakcal app icon', bg: light.bg, ink: light.ink, label: 'Kakcal app icon' }));
await write(`${logos}kakcalculator-icon-inverted.svg`, icon({ title: 'Kakcal app icon (inverted)', bg: dark.bg, ink: dark.ink, label: 'Kakcal app icon' }));
await write(`${logos}kakcalculator-icon-theme-aware.svg`,
  icon({ title: 'Kakcal theme-aware app icon', bg: `var(--kc-surface, ${light.bg})`, ink: `var(--kc-contrast, ${light.ink})`, label: 'Kakcal app icon' }));

const p = ICON.poop;
console.log(`pig outer x ${ICON.pig.left}..${ICON.pig.right} (line ${PIG.iconStroke}); poop x ${p.x} y ${p.y} scale ${p.scale}, line ${p.strokeWidth} (= ${(p.strokeWidth * p.scale).toFixed(2)} in icon units), halo ${ICON.haloLocal}`);
