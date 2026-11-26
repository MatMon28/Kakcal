import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../src/context/appStorage';
import { translations } from '../src/i18n/translations';

const ROOT = path.resolve(__dirname, '..');

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

describe('repository invariants', () => {
  it('preserves CSS @import cascade order in src/index.css', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
    const imports = [...css.matchAll(/@import\s+"([^"]+)";/g)].map((m) => m[1]);

    expect(imports[0]).toBe('tailwindcss');
    expect(imports[1]).toBe('./components/journal/journal.css');
    expect(imports.at(-1)).toBe('./styles/performance.css');

    const idx = (target: string) => imports.indexOf(target);
    expect(idx('./styles/themed-overrides.css')).toBeGreaterThan(-1);
    expect(idx('./styles/themed-tones.css')).toBeGreaterThan(idx('./styles/themed-overrides.css'));
    expect(idx('./styles/themed-glass.css')).toBeGreaterThan(idx('./styles/themed-tones.css'));
    expect(idx('./styles/themed-material.css')).toBeGreaterThan(idx('./styles/themed-tones.css'));
  });

  it('covers all 9 theme styles x 3 modes in index.html pre-paint BG_MAP', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const match = html.match(/var BG_MAP = (\{[\s\S]*?\n\s*\});/);
    expect(match).not.toBeNull();

    const bgMap = new Function(`return ${match![1]};`)() as Record<string, Record<string, string>>;
    const styles = ['classic', 'angular', 'aurora', 'pop', 'playful', 'minimal', 'mono', 'glass', 'material'];
    const modes = ['light', 'lite-dark', 'dark'];

    for (const style of styles) {
      expect(bgMap[style], `missing style ${style} in BG_MAP`).toBeDefined();
      for (const mode of modes) {
        expect(bgMap[style][mode], `missing ${style}.${mode} in BG_MAP`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('keeps recursive EN and IT translation keys identical', () => {
    const enKeys = collectKeys(translations.en).sort();
    const itKeys = collectKeys(translations.it).sort();
    expect(itKeys).toEqual(enKeys);
  });

  it('keeps exportDataJson aligned with all persisted STORAGE_KEYS', () => {
    expect(Object.keys(STORAGE_KEYS)).toEqual([
      'LANG',
      'PROFILE',
      'CUSTOM_FOODS',
      'USED_FOODS',
      'DAY_LOGS',
      'PREBUILT_MEALS',
      'SETTINGS',
      'CUSTOM_ACTIVITIES',
      'PERIOD',
    ]);

    const ctx = fs.readFileSync(path.join(ROOT, 'src/context/AppContext.tsx'), 'utf8');
    const exportMatch = ctx.match(/const exportDataJson[\s\S]*?return JSON\.stringify\(data/);
    expect(exportMatch).not.toBeNull();

    const expectedFields = [
      'language',
      'userProfile',
      'customFoods',
      'usedFoods',
      'dayLogs',
      'preBuiltMeals',
      'settings',
      'periodData',
      'customActivities',
      'advanced',
      'layout',
      'mealJournal',
      'lastAmounts',
      'plannerDraft',
      'preferences',
    ];
    for (const field of expectedFields) {
      expect(exportMatch![0], `missing ${field} in exportDataJson`).toContain(field);
    }
  });

  it('wires universal [data-kc-tone] and [data-kc-tone-ink] hooks in themed-tones.css', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/styles/themed-tones.css'), 'utf8');
    for (const tone of ['diary', 'meals', 'recipes', 'planner', 'photo', 'foods', 'teal']) {
      const matches = css.match(new RegExp(`\\[data-kc-tone="${tone}"\\]`, 'g')) ?? [];
      expect(matches.length, `[data-kc-tone="${tone}"] count`).toBeGreaterThanOrEqual(2);
    }
    expect(css).toContain('html[data-style="minimal"] [data-kc-tone] [data-kc-tone-ink]');
  });

  it('avoids raw Tailwind palette colour classes in src/components', () => {
    const rawPaletteRe = /\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
    const stack = [path.join(ROOT, 'src/components')];
    const violations: string[] = [];

    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          const match = content.match(rawPaletteRe);
          if (match) {
            violations.push(`${path.relative(ROOT, full)}: ${match[0]}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
