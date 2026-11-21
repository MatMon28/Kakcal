#!/usr/bin/env node
// Renders the Android launcher, round, adaptive-foreground and Play Store PNGs
// from src/assets/brand/kakcalculator-icon.svg (written by scripts/generate-icon.mjs: Koink-style icon on a
// 1024 canvas). Needs Playwright's Chromium:
//   npm ci && npx playwright install chromium && node scripts/generate-icon.mjs && node scripts/render-brand.mjs
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(path.join(root, 'src/assets/brand/kakcalculator-icon.svg'), 'utf8');
if (!/<rect[^>]*rx="240"[^>]*\/>/.test(source)) {
  throw new Error('Unexpected icon: the rounded background tile was not found.');
}

import { LOGO_CENTRE, PALETTE } from './brand-geometry.mjs';

const CREAM = PALETTE.light.bg;
// Everything after the rounded tile is the artwork (the K and the poop).
// Its bounding-box centre in icon units (1024 canvas) is LOGO_CENTRE, as in Koink.
const { x: CX, y: CY } = LOGO_CENTRE;
const artwork = source.replace(/^[\s\S]*?<rect[^>]*\/>/, '').replace(/<\/svg>\s*$/, '');
const NS = 'xmlns="http://www.w3.org/2000/svg"';

const markup = {
  // The supplied icon, with its rounded tile and transparent corners, for legacy launchers.
  launcher: source,
  // Circular crop for launchers that request round icons.
  round: `<svg ${NS} width="512" height="512" viewBox="0 0 1024 1024"><defs><clipPath id="round"><circle cx="512" cy="512" r="512"/></clipPath></defs><g clip-path="url(#round)"><rect width="1024" height="1024" fill="${CREAM}"/><g transform="translate(512 512) translate(${-CX} ${-CY})">${artwork}</g></g></svg>`,
  // Adaptive foreground on a 108 dp canvas. 0.084 dp per icon unit (1024 canvas) keeps the visible outline inside the 66 dp safe circle.
  foreground: (px) => `<svg ${NS} width="${px}" height="${px}" viewBox="0 0 108 108"><g transform="translate(54 54) scale(0.084) translate(${-CX} ${-CY})">${artwork}</g></svg>`,
  // Full-bleed square for the Play Console, which applies its own mask.
  play: `<svg ${NS} width="512" height="512" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${CREAM}"/>${artwork}</svg>`,
};

const densities = [
  ['mipmap-mdpi', 48, 108],
  ['mipmap-hdpi', 72, 162],
  ['mipmap-xhdpi', 96, 216],
  ['mipmap-xxhdpi', 144, 324],
  ['mipmap-xxxhdpi', 192, 432],
];
const res = path.join(root, 'android/app/src/main/res');
const playFile = path.join(root, 'android/store/kakcalculator-play-icon-512.png');
const uri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(svg, size, file, transparent = true) {
  await mkdir(path.dirname(file), { recursive: true });
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}img{display:block;width:${size}px;height:${size}px}</style></head><body><img alt="" src="${uri(svg)}"></body></html>`,
  );
  await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

for (const [dir, launcher, adaptive] of densities) {
  await render(markup.launcher, launcher, path.join(res, dir, 'ic_launcher.png'));
  await render(markup.round, launcher, path.join(res, dir, 'ic_launcher_round.png'));
  await render(markup.foreground(adaptive), adaptive, path.join(res, dir, 'ic_launcher_foreground.png'));
}
await render(markup.play, 512, playFile, false);

// Measure the visible artwork on the 432 px (108 dp) adaptive layer.
await page.setViewportSize({ width: 432, height: 432 });
await page.setContent('<canvas width="432" height="432"></canvas>');
const radiusDp = await page.evaluate(async (src) => {
  const image = new Image();
  image.src = src;
  await image.decode();
  const context = document.querySelector('canvas').getContext('2d');
  context.drawImage(image, 0, 0, 432, 432);
  const pixels = context.getImageData(0, 0, 432, 432).data;
  let farthest = 0;
  for (let y = 0; y < 432; y++) {
    for (let x = 0; x < 432; x++) {
      if (pixels[(y * 432 + x) * 4 + 3] > 40) farthest = Math.max(farthest, Math.hypot(x + 0.5 - 216, y + 0.5 - 216));
    }
  }
  return farthest / 4; // 432 px spans 108 dp, so there are 4 px per dp.
}, uri(markup.foreground(432)));
await browser.close();
if (radiusDp > 34.5) {
  throw new Error(`Adaptive artwork reaches ${radiusDp.toFixed(1)} dp; keep it inside the 66 dp safe circle.`);
}

// Check every output size from the PNG header (IHDR width and height).
async function pngSize(file) {
  const bytes = await readFile(file);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
for (const [dir, launcher, adaptive] of densities) {
  for (const [name, expected] of [
    ['ic_launcher.png', launcher],
    ['ic_launcher_round.png', launcher],
    ['ic_launcher_foreground.png', adaptive],
  ]) {
    const [width, height] = await pngSize(path.join(res, dir, name));
    if (width !== expected || height !== expected) {
      throw new Error(`${dir}/${name} is ${width}x${height}, expected ${expected}x${expected}.`);
    }
  }
}
const [playWidth, playHeight] = await pngSize(playFile);
if (playWidth !== 512 || playHeight !== 512) throw new Error('The Play Store icon must be 512 x 512.');

console.log(`Rendered ${densities.length * 3 + 1} PNG files from the supplied icon.`);
console.log(`Adaptive artwork reaches ${radiusDp.toFixed(1)} dp from the centre (safe circle: 33 dp).`);
