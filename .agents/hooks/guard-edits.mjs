import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const raw = fs.readFileSync(0, 'utf8').trim();
const payload = raw ? JSON.parse(raw) : {};
const args = payload?.toolCall?.args || {};
const editedPath = String(args.Path || args.path || '').replace(/\\/g, '/');
const repoRoot = payload?.cwd || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');

function checkIndexCssOrder(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');
  const imports = [...css.matchAll(/@import\s+"([^"]+)";/g)].map((m) => m[1]);
  const idx = (target) => imports.indexOf(target);

  const problems = [];
  if (imports[0] !== 'tailwindcss') problems.push('First @import must be "tailwindcss".');
  if (imports[1] !== './components/journal/journal.css') problems.push('Second @import must be "./components/journal/journal.css".');
  if (imports.at(-1) !== './styles/performance.css') problems.push('Last @import must be "./styles/performance.css".');
  if (idx('./styles/themed-tones.css') <= idx('./styles/themed-overrides.css')) {
    problems.push('"./styles/themed-tones.css" must stay after "./styles/themed-overrides.css".');
  }
  if (idx('./styles/themed-glass.css') <= idx('./styles/themed-tones.css')) {
    problems.push('"./styles/themed-glass.css" must stay after "./styles/themed-tones.css".');
  }
  if (idx('./styles/themed-material.css') <= idx('./styles/themed-tones.css')) {
    problems.push('"./styles/themed-material.css" must stay after "./styles/themed-tones.css".');
  }
  if (problems.length > 0) {
    console.error(`CSS @import order violation in src/index.css:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
}

const RAW_PALETTE_RE = /\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const MOTION_UNSAFE_RE = /\b(?<!motion-safe:)animate-(?:pulse|bounce)\b/g;

function checkComponentTokens(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...new Set(content.match(RAW_PALETTE_RE) ?? [])];
  if (matches.length > 0) {
    console.error(
      `Raw Tailwind palette colour class(es) in ${path.relative(repoRoot, filePath)}: ${matches.join(', ')}\n` +
      `Use .kc-themed-card, data-kc-tone, @theme utilities (bg-intake, text-carbs-ink, etc.), and Kakcal CSS tokens instead.`
    );
    process.exit(1);
  }
  if (/data-kc-tone\s*=/.test(content) && !content.includes('data-kc-tone-ink')) {
    console.error(
      `Missing data-kc-tone-ink in ${path.relative(repoRoot, filePath)}: components using data-kc-tone must mark header text/icons with data-kc-tone-ink for Minimal mode.`
    );
    process.exit(1);
  }
  if (/bg-\[var\(--text\)\]/.test(content) && /text-\[var\(--surface\)\]/.test(content)) {
    console.error(
      `Found bg-[var(--text)] with text-[var(--surface)] in ${path.relative(repoRoot, filePath)}: use text-[var(--on-text)] instead.`
    );
    process.exit(1);
  }
  if (/font-family\s*:/.test(content) || /\bfont-\[/.test(content)) {
    console.error(
      `Hardcoded font-family in ${path.relative(repoRoot, filePath)}: inherit Kakcal's theme font-family.`
    );
    process.exit(1);
  }
  if (/['"]\/day['"]|>avg</.test(content)) {
    console.error(
      `Hardcoded English '/day' or '>avg<' in ${path.relative(repoRoot, filePath)}: use localized t.stats.perDay or j('avg', 'med').`
    );
    process.exit(1);
  }
  const unsafeMotion = [...new Set(content.match(MOTION_UNSAFE_RE) ?? [])];
  if (unsafeMotion.length > 0) {
    console.error(
      `Use motion-safe:${unsafeMotion[0]} in ${path.relative(repoRoot, filePath)} so prefers-reduced-motion is respected.`
    );
    process.exit(1);
  }
}

function checkJournalCss(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (/font-weight\s*:\s*(?:650|750)\b/.test(content)) {
    console.error(
      `Off-scale font-weight (650/750) in ${path.relative(repoRoot, filePath)}: use standard weights 500, 600, 700, or 800.`
    );
    process.exit(1);
  }
  if (/font-family\s*:/.test(content)) {
    console.error(
      `Hardcoded font-family in ${path.relative(repoRoot, filePath)}: inherit Kakcal's theme font-family.`
    );
    process.exit(1);
  }
}

try {
  if (editedPath.endsWith('/src/index.css') || editedPath === 'src/index.css') {
    checkIndexCssOrder(path.resolve(repoRoot, 'src/index.css'));
  } else if (editedPath.includes('/android/app/src/main/res/layout/')) {
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts/check-widget-layouts.mjs')], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else if (/(?:^|\/)src\/components\/.*\.(?:tsx|ts)$/.test(editedPath)) {
    const resolved = path.isAbsolute(editedPath) ? editedPath : path.resolve(repoRoot, editedPath);
    checkComponentTokens(resolved);
  } else if (/(?:^|\/)src\/components\/journal\/css\/.*\.css$/.test(editedPath)) {
    const resolved = path.isAbsolute(editedPath) ? editedPath : path.resolve(repoRoot, editedPath);
    checkJournalCss(resolved);
  }
  process.stdout.write('{}\n');
} catch (err) {
  const msg = err?.stderr?.toString() || err?.message || String(err);
  console.error(msg);
  process.exit(1);
}
