#!/usr/bin/env node
// Renders the large reminder-notification icon: a FULL-BLEED cream square (no rounded tile, no transparent
// corners) with the K + poop at full size. Android crops the large icon to a circle on most phones, so the old
// rounded tile with transparent corners showed up as "a small square inside a green circle"; this one fills
// the whole circle. Needs Playwright's Chromium:
//   npm i --no-save playwright && npx playwright install chromium && node scripts/render-notification-icon.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(path.join(root, 'src/assets/brand/kakcalculator-icon.svg'), 'utf8');
const CREAM = '#FBF3E3';
// Everything after the rounded tile is the artwork; its bounding-box centre is (273.5, 269.5).
const artwork = source.replace(/^[\s\S]*?<rect[^>]*\/>/, '').replace(/<\/svg>\s*$/, '');
const SIZE = 256; // px, stored in drawable-xxhdpi (the system scales it down)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512"><rect width="512" height="512" fill="${CREAM}"/><g transform="translate(256 256) scale(1.05) translate(-273.5 -269.5)">${artwork}</g></svg>`;
const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: SIZE, height: SIZE } });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff"><img alt="" style="display:block;width:${SIZE}px;height:${SIZE}px" src="${uri}"></body></html>`);
await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
const file = path.join(root, 'android/app/src/main/res/drawable-xxhdpi/ic_notification_large.png');
await page.screenshot({ path: file, omitBackground: false, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });

// The artwork must stay inside the circle the system crops to.
const radius = await page.evaluate(async (src) => {
  const image = new Image();
  image.src = src;
  await image.decode();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 256, 256);
  const d = ctx.getImageData(0, 0, 256, 256).data;
  let far = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    if (d[i] < 140 && d[i + 1] < 140) far = Math.max(far, Math.hypot(x + 0.5 - 128, y + 0.5 - 128)); // dark ink pixels
  }
  return far;
}, uri);
await browser.close();
if (radius > 125) throw new Error(`Artwork reaches ${radius.toFixed(1)} of 128 px; it would be cut by the circular crop.`);
const bytes = await readFile(file);
console.log(`wrote ${path.relative(root, file)} (${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}, ink radius ${radius.toFixed(1)}/128)`);
