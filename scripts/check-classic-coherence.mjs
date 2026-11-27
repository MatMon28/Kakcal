import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLum([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(hexA, hexB) {
  const l1 = relLum(hexToRgb(hexA));
  const l2 = relLum(hexToRgb(hexB));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function extractVars(block) {
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

// 1. Classic theme-tokens.css WCAG AA contrast across light, lite-dark, and dark
const tokensCss = read('src/styles/theme-tokens.css');
const themeMatch = tokensCss.match(/@theme\s*\{([\s\S]*?)\}/);
const rootBlock = tokensCss.match(/\/\* ---- Three themes:[\s\S]*?^:root\s*\{([\s\S]*?)^\}/m);
const liteDarkBlock = tokensCss.match(/^\[data-theme="lite-dark"\]\s*\{([\s\S]*?)^\}/m);
const darkBlock = tokensCss.match(/^\[data-theme="dark"\]\s*\{([\s\S]*?)^\}/m);

if (!themeMatch || !rootBlock || !liteDarkBlock || !darkBlock) {
  errors.push('Missing Classic @theme or light/lite-dark/dark token blocks in src/styles/theme-tokens.css.');
} else {
  const themeVars = extractVars(themeMatch[1]);
  const modes = [
    { name: 'light', vars: extractVars(rootBlock[1]) },
    { name: 'lite-dark', vars: extractVars(liteDarkBlock[1]) },
    { name: 'dark', vars: extractVars(darkBlock[1]) },
  ];
  for (const mode of modes) {
    const bg = mode.vars['--bg'];
    const surface = mode.vars['--surface'];
    for (const fgKey of ['--text', '--muted', '--text-pos', '--text-neg', '--text-warn', '--text-sky', '--text-heart']) {
      const fg = mode.vars[fgKey];
      if (!fg || !fg.startsWith('#')) {
        errors.push(`Classic ${mode.name} missing hex for ${fgKey}`);
        continue;
      }
      for (const [bgName, bgHex] of [['--bg', bg], ['--surface', surface]]) {
        const ratio = contrast(fg, bgHex);
        if (ratio < 4.5) {
          errors.push(`Classic ${mode.name} ${fgKey} (${fg}) on ${bgName} (${bgHex}) contrast ${ratio.toFixed(2)} < 4.5:1`);
        }
      }
    }
    const onSurfacePairs = mode.name === 'light'
      ? [['intake', themeVars['--color-intake-accent']], ['activity', themeVars['--color-activity-accent']], ['weight', themeVars['--color-weight-accent']]]
      : [['intake', themeVars['--color-intake']], ['activity', themeVars['--color-activity']], ['weight', themeVars['--color-weight']]];
    for (const [label, fg] of onSurfacePairs) {
      const ratio = contrast(fg, surface);
      if (ratio < 4.5) {
        errors.push(`Classic ${mode.name} --${label}-on-surface (${fg}) on --surface (${surface}) contrast ${ratio.toFixed(2)} < 4.5:1`);
      }
    }
  }
}

// 2. Android Classic widget parity checks
const widgetSurface = read('android/app/src/main/res/drawable/widget_surface.xml');
const widgetTray = read('android/app/src/main/res/drawable/widget_tray.xml');
const widgetLarge = read('android/app/src/main/res/layout/widget_large.xml');
const widgetStyles = read('android/app/src/main/res/values/widget_styles.xml');
if (!widgetSurface.includes('#94FBF8F2')) errors.push('widget_surface.xml must use #94FBF8F2 (58% alpha).');
if (!widgetTray.includes('#94FBF8F2') || !widgetTray.includes('#E2D9C8')) {
  errors.push('widget_tray.xml must use #94FBF8F2 with #E2D9C8 border.');
}
if (!widgetLarge.includes('#E2D9C8')) errors.push('widget_large.xml divider must use #E2D9C8.');
if (!widgetStyles.includes('tnum')) errors.push('widget_styles.xml must set fontFeatureSettings tnum on numeric styles.');
for (const card of ['intake', 'burned', 'carbs', 'protein', 'fat']) {
  for (const suffix of ['', '_dark']) {
    const rel = `android/app/src/main/res/drawable/widget_card_${card}${suffix}.xml`;
    if (!read(rel).includes('16dp')) errors.push(`${rel} must use 16dp concentric corner radius.`);
  }
}

// 3. No duplicate local Switch components & no 650/750 weights in journal/css/*
function walk(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

for (const file of walk(path.join(root, 'src/components'), '.tsx')) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel === 'src/components/common/Switch.tsx') continue;
  const content = fs.readFileSync(file, 'utf8');
  if (/\bconst\s+Switch(?:Visual)?\b/.test(content)) {
    errors.push(`Duplicate Switch component in ${rel}: import from src/components/common/Switch.tsx instead.`);
  }
}

for (const file of walk(path.join(root, 'src/components/journal/css'), '.css')) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  if (/font-weight\s*:\s*(?:650|750)\b/.test(content)) {
    errors.push(`Off-scale font-weight (650/750) in ${rel}.`);
  }
}

if (errors.length > 0) {
  console.error('Classic coherence check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Classic coherence OK (tokens AA, Android Classic widget parity, shared Switch, journal CSS weights).');
