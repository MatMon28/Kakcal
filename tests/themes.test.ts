import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyThemeAttributes, getMonoVariables, getRelativeLuminance, MONO_HUES, normalizeThemeStyle, SIX_NEW_THEMES, THEME_STYLE_LIST } from '../src/utils/themes';

// jsdom replaces URL, so paths are resolved from the project root (where `vitest run` is started).
const read = (file: string) => readFileSync(resolve(process.cwd(), 'src/styles', file), 'utf8');
const MODES = ['light', 'lite-dark', 'dark'] as const;
const TONES = ['diary', 'meals', 'recipes', 'planner', 'photo', 'foods', 'teal'];

describe('Glass and Material theme styles', () => {
  it('are valid theme styles and have a settings preset', () => {
    for (const id of ['glass', 'material'] as const) {
      expect(THEME_STYLE_LIST).toContain(id);
      expect(normalizeThemeStyle(id)).toBe(id);
      expect(SIX_NEW_THEMES.some((preset) => preset.id === id)).toBe(true);
    }
    expect(normalizeThemeStyle('nonsense')).toBe('classic');
  });

  it('set the style and mode attributes on <html>', () => {
    applyThemeAttributes('lite-dark', 'glass');
    expect(document.documentElement.getAttribute('data-style')).toBe('glass');
    expect(document.documentElement.getAttribute('data-theme')).toBe('lite-dark');
    applyThemeAttributes('light', 'material');
    expect(document.documentElement.getAttribute('data-style')).toBe('material');
  });

  for (const style of ['glass', 'material']) {
    const css = read(`theme-${style}.css`);
    for (const mode of MODES) {
      it(`${style} defines ${mode} with an opaque --bg (the Android splash generator needs a hex) and every token`, () => {
        const block = css.match(new RegExp(`^html\\[data-style="${style}"\\]\\[data-theme="${mode}"\\]\\s*\\{([^}]*)\\}`, 'm'));
        expect(block, `${style} ${mode} block`).not.toBeNull();
        const body = block![1];
        expect(body).toMatch(/--bg:\s*#[0-9a-fA-F]{6}/);
        for (const token of ['--surface', '--text', '--muted', '--nav-active-bg', '--intake-bg', '--burned-bg', '--carbs-bg', '--protein-bg', '--fat-bg', '--fiber-bg', '--dock-bg', '--dock-1', '--dock-6']) {
          expect(body, token).toContain(`${token}:`);
        }
        for (const tone of TONES) {
          expect(body, `--tone-${tone}`).toContain(`--tone-${tone}:`);
          expect(body, `--tone-${tone}-in`).toContain(`--tone-${tone}-in:`);
        }
      });
    }
  }

  it('themed-tones.css has a rule for every tone', () => {
    const css = read('themed-tones.css');
    for (const tone of TONES) expect(css).toContain(`var(--tone-${tone})`);
  });

  it('index.css imports the new parts after the generic themed rules', () => {
    const index = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const pos = (name: string) => index.indexOf(`./styles/${name}.css`);
    for (const name of ['theme-glass', 'theme-material', 'themed-tones', 'themed-glass', 'themed-material']) expect(pos(name)).toBeGreaterThan(-1);
    expect(pos('theme-glass')).toBeLessThan(pos('themed-chrome'));
    expect(pos('themed-tones')).toBeGreaterThan(pos('themed-overrides'));
    expect(pos('themed-glass')).toBeGreaterThan(pos('themed-tones'));
    expect(pos('themed-material')).toBeGreaterThan(pos('themed-glass'));
  });
});

function contrastRatio(hexA: string, hexB: string): number {
  const a = getRelativeLuminance(hexA);
  const b = getRelativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('Cross-style consistency and WCAG contrast guards', () => {
  it('wires the continuous tab indicator to theme --nav-active-bg / --nav-pill-radius tokens', () => {
    const overrides = read('themed-overrides.css');
    expect(overrides).toContain('var(--nav-active-bg');
    expect(overrides).toContain('var(--nav-active-color');
    expect(overrides).toContain('var(--nav-pill-radius');
  });

  it('binds Today dock actions semantically so hiding shortcuts never shifts colours', () => {
    const cards = read('themed-cards.css');
    for (const action of ['food', 'activity', 'water', 'poop', 'weight', 'custom']) {
      expect(cards).toContain(`[data-dock-action="${action}"]`);
    }
  });

  it('maintains >= 4.5:1 contrast for Mono --*-on-surface tokens across all 10 hues and 3 modes', () => {
    for (const hue of MONO_HUES) {
      for (const mode of MODES) {
        const vars = getMonoVariables(hue.hex, mode);
        const surface = vars['--surface'];
        expect(contrastRatio(vars['--intake-on-surface'], surface), `${hue.id} ${mode} intake`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(vars['--activity-on-surface'], surface), `${hue.id} ${mode} activity`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(vars['--weight-on-surface'], surface), `${hue.id} ${mode} weight`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps Material chips at 8px and search inputs borderless at matching specificity', () => {
    const mat = read('themed-material.css');
    expect(mat).toContain('var(--pill-radius, 8px)');
    expect(mat).toContain('html[data-style="material"]:not([data-style="classic"]) :is(.journal-search');
  });

  it('tints Today trackers and Custom sections for full-field styles while Minimal tints only header text and icons', () => {
    const tonesCss = read('themed-tones.css');
    for (const tracker of ['activity', 'water', 'poop', 'custom']) {
      expect(tonesCss, tracker).toContain(`[data-tracker="${tracker}"]`);
    }
    expect(tonesCss).toContain('html[data-style]:not([data-style="classic"]):not([data-style="minimal"]) :is([data-library-section], [data-tracker], [data-stats-tone], [data-water-stats], [data-period-card])');
    expect(tonesCss).toContain('html[data-style="minimal"] [data-tracker]');
    expect(tonesCss).toContain('html[data-style="minimal"] [data-library-section] [data-library-header]');

    // Full-field tinted styles define all --tone-* / --tone-*-in + --tone-pale pairs per mode
    const fullFieldStyles: Record<string, string> = {
      angular: 'theme-angular.css',
      aurora: 'theme-aurora.css',
      pop: 'theme-pop.css',
      playful: 'theme-playful.css',
      glass: 'theme-glass.css',
      material: 'theme-material.css',
    };
    for (const [style, file] of Object.entries(fullFieldStyles)) {
      const css = read(file);
      for (const mode of MODES) {
        const block = css.match(new RegExp(`^html\\[data-style="${style}"\\]\\[data-theme="${mode}"\\]\\s*\\{([^}]*)\\}`, 'm'));
        expect(block, `${style} ${mode}`).not.toBeNull();
        const body = block![1];
        for (const tone of TONES) {
          expect(body, `${style} ${mode} --tone-${tone}`).toContain(`--tone-${tone}:`);
          expect(body, `${style} ${mode} --tone-${tone}-in`).toContain(`--tone-${tone}-in:`);
        }
        expect(body, `${style} ${mode} --tone-pale`).toContain('--tone-pale:');
      }
    }

    // Minimal defines WCAG AA >= 4.5:1 --tone-ink-* colours on its neutral --surface (not field background)
    const minCss = read('theme-minimal-mono.css');
    for (const mode of MODES) {
      const block = minCss.match(new RegExp(`^html\\[data-style="minimal"\\]\\[data-theme="${mode}"\\]\\s*\\{([^}]*)\\}`, 'm'));
      expect(block, `minimal ${mode}`).not.toBeNull();
      const body = block![1];
      const surface = body.match(/--surface:\s*(#[0-9a-fA-F]{6})/)![1];
      for (const tone of TONES) {
        const inkMatch = body.match(new RegExp(`--tone-ink-${tone}:\\s*(#[0-9a-fA-F]{6})`));
        expect(inkMatch, `minimal ${mode} --tone-ink-${tone}`).not.toBeNull();
        expect(contrastRatio(inkMatch![1], surface), `minimal ${mode} ${tone} ink`).toBeGreaterThanOrEqual(4.5);
      }
    }

    // Mono emits stepped single-hue --tone-* tokens with >= 4.5:1 text contrast
    for (const hue of MONO_HUES) {
      for (const mode of MODES) {
        const vars = getMonoVariables(hue.hex, mode);
        for (const tone of TONES) {
          const bg = vars[`--tone-${tone}`];
          expect(bg, `mono ${hue.id} ${mode} --tone-${tone}`).toMatch(/^#[0-9a-f]{6}$/);
          expect(contrastRatio(vars['--text'], bg), `mono ${hue.id} ${mode} ${tone} text`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('styles Settings badges, Calendar controls, Compact/Expanded switcher and Meal Planner controls coherently', () => {
    const cards = read('themed-cards.css');
    for (const hook of [
      '[data-settings-badge]',
      '[data-settings-switch="on"]',
      '[data-cal-nav]',
      '[data-cal-trigger]',
      '[data-cal-popover]',
      '[data-cal-today-btn]',
      '[data-layout-switch]',
      '[data-layout-btn][data-active="true"]',
      '.journal-weekdays button.is-skipped',
      '.journal-day-grid button.is-on',
      '.journal-food-chip.is-meal',
      '.journal-plan-suggestion.is-past',
      '.journal-shopping-notice',
    ]) {
      expect(cards, hook).toContain(hook);
    }
  });

  it('keeps Statistics fields (Poop/Water/Custom), Period cards & Body icons coherent with every style', () => {
    const tones = read('themed-tones.css');
    for (const sel of ['[data-stats-tone="poop"]', '[data-stats-tone="custom"]', '[data-water-stats]', '[data-period-card="cycle"]', '[data-period-card="phase"]']) {
      expect(tones, sel).toContain(sel);
    }
    const cards = read('themed-cards.css');
    for (const sel of ['[data-range-switch]', '[data-stat-pill="poop"]', '[data-stat-pill="weight"]', '[data-body-icon]', '[data-dock-action="pill"]']) {
      expect(cards, sel).toContain(sel);
    }
  });

  it('keeps the Large and Medium widgets coherent with the active style in browser gallery and Android', () => {
    const widgetCss = readFileSync(resolve(process.cwd(), 'src/components/widgets/widget-preview.css'), 'utf8');
    expect(widgetCss).toContain("html[data-style]:not([data-style='classic']) .widget-large");
    expect(widgetCss).toContain("html[data-style='glass'] .widget-large");
    expect(widgetCss).toContain("html[data-style='material'] .widget-large");
    expect(widgetCss).toContain("html[data-style='angular'] .widget-large");
    expect(widgetCss).toContain("html[data-style]:not([data-style='classic']) .widget-wallpaper");
    const matCss = read('theme-material.css');
    expect(matCss).toContain('--nav-radius: 18px');
    expect(matCss).toContain('--nav-pill-radius: 14px');
    expect(matCss).toContain('--dock-radius: 22px');
    const glassCss = read('themed-glass.css');
    expect(glassCss).toContain(':not([data-library-section])');
    const java = readFileSync(resolve(process.cwd(), 'android/app/src/main/java/com/kcalsync/app/JournalWidgetProvider.java'), 'utf8');
    expect(java).toContain('applyLargeTheme(');
    for (const style of ['angular', 'aurora', 'pop', 'playful', 'minimal', 'glass', 'material']) {
      expect(java, style).toContain(`"${style}".equals(themeStyle)`);
    }
  });
});
