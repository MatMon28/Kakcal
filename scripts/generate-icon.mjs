#!/usr/bin/env node
// Writes the Kakcal app icon SVGs: a rounded tile (1024 x 1024, radius 240), the SOLID poop in ink, and the K of the
// Koink brand carved out of its belly (the K is painted in the tile colour). Koink's exact colours.
//
//   src/assets/brand/kakcalculator-icon.svg                              light tile (source of every PNG)
//   src/assets/kakcalculator_intro/logos/kakcalculator-icon{,-inverted,-theme-aware}.svg
//
// Run it before the PNG scripts (they read the first file):
//   node scripts/generate-icon.mjs && node scripts/render-brand.mjs && node scripts/render-pwa-icons.mjs
// No dependency. Geometry: scripts/brand-geometry.mjs. Explained in docs/brand.md > The icon.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ICON, ICON_SIZE, LOGO_CENTRE, PALETTE, TILE_RADIUS, iconArtwork } from './brand-geometry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

const icon = ({ title, bg, ink, label }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="512" height="512"${label ? ` role="img" aria-label="${label}"` : ''}>` +
  `<title>${title}</title><rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${TILE_RADIUS}" fill="${bg}"/>${iconArtwork({ ink, bg })}</svg>\n`;

const write = (file, text) => writeFile(path.join(root, file), text);
const { light, dark } = PALETTE;
await write('src/assets/brand/kakcalculator-icon.svg', icon({ title: 'Kakcal icon', bg: light.bg, ink: light.ink }));
const logos = 'src/assets/kakcalculator_intro/logos/';
await write(`${logos}kakcalculator-icon.svg`, icon({ title: 'Kakcal app icon', bg: light.bg, ink: light.ink, label: 'Kakcal app icon' }));
await write(`${logos}kakcalculator-icon-inverted.svg`, icon({ title: 'Kakcal app icon (inverted)', bg: dark.bg, ink: dark.ink, label: 'Kakcal app icon' }));
await write(`${logos}kakcalculator-icon-theme-aware.svg`,
  icon({ title: 'Kakcal theme-aware app icon', bg: `var(--kc-surface, ${light.bg})`, ink: `var(--kc-contrast, ${light.ink})`, label: 'Kakcal app icon' }));

console.log(`icon written: poop ${ICON.poopTransform}, K ${ICON.kTransform}, artwork centre ${LOGO_CENTRE.x} ${LOGO_CENTRE.y}`);
