import type { Theme, ThemeStyle } from '../types';

export interface ThemePresetMeta {
  id: ThemeStyle;
  name: { en: string; it: string };
  tag: { en: string; it: string };
  swatches: [string, string, string];
}

export interface MonoHueOption {
  id: string;
  hex: string;
  label: { en: string; it: string };
}

export const THEME_STYLE_LIST: ThemeStyle[] = [
  'classic',
  'angular',
  'aurora',
  'pop',
  'playful',
  'minimal',
  'mono',
  'glass',
  'material',
];

export const SIX_NEW_THEMES: ThemePresetMeta[] = [
  {
    id: 'angular',
    name: { en: 'Angular', it: 'Angular' },
    tag: { en: 'Chamfered · Tactical', it: 'Smussato · Tattico' },
    swatches: ['#0b1019', '#ff551a', '#7dd3fc'],
  },
  {
    id: 'aurora',
    name: { en: 'Aurora', it: 'Aurora' },
    tag: { en: 'Glass · Mint & Coral', it: 'Vetro · Menta e Corallo' },
    swatches: ['#16112b', '#34d399', '#fb7185'],
  },
  {
    id: 'pop',
    name: { en: 'Pop', it: 'Pop' },
    tag: { en: 'Neo-Brutalist · Bold', it: 'Neo-Brutalista · Deciso' },
    swatches: ['#fae043', '#7ef29d', '#ff7a7a'],
  },
  {
    id: 'playful',
    name: { en: 'Playful', it: 'Playful' },
    tag: { en: 'Bubbly · Soft Pastel', it: 'Morbido · Pastello' },
    swatches: ['#312e81', '#34d399', '#fb7185'],
  },
  {
    id: 'minimal',
    name: { en: 'Minimal', it: 'Minimal' },
    tag: { en: 'Hairline · Crisp Slate', it: 'Essenziale · Ardesia' },
    swatches: ['#060911', '#3b82f6', '#e2e8f0'],
  },
  {
    id: 'mono',
    name: { en: 'Mono', it: 'Mono' },
    tag: { en: 'Single-Hue Tonal', it: 'Monocromatico Tonale' },
    swatches: ['#1e293b', '#64748b', '#cbd5e1'],
  },
  {
    id: 'glass',
    name: { en: 'Glass', it: 'Vetro' },
    tag: { en: 'Frosted · Lavender Blur', it: 'Smerigliato · Lavanda' },
    swatches: ['#c4bdf5', '#8fdcc2', '#f4a6bd'],
  },
  {
    id: 'material',
    name: { en: 'Material', it: 'Material' },
    tag: { en: 'Tonal · Material You', it: 'Tonale · Material You' },
    swatches: ['#fff7ff', '#cde8d2', '#f0d4d6'],
  },
];

export const MONO_HUES: MonoHueOption[] = [
  { id: 'slate', hex: '#64748b', label: { en: 'Slate', it: 'Ardesia' } },
  { id: 'emerald', hex: '#059669', label: { en: 'Emerald', it: 'Smeraldo' } },
  { id: 'cobalt', hex: '#2563eb', label: { en: 'Cobalt', it: 'Cobalto' } },
  { id: 'crimson', hex: '#dc2626', label: { en: 'Crimson', it: 'Cremisi' } },
  { id: 'amber', hex: '#d97706', label: { en: 'Amber', it: 'Ambra' } },
  { id: 'violet', hex: '#7c3aed', label: { en: 'Violet', it: 'Viola' } },
  { id: 'teal', hex: '#0d9488', label: { en: 'Teal', it: 'Ottanio' } },
  { id: 'rose', hex: '#e11d48', label: { en: 'Rose', it: 'Rosa' } },
  { id: 'indigo', hex: '#4f46e5', label: { en: 'Indigo', it: 'Indaco' } },
  { id: 'olive', hex: '#65a30d', label: { en: 'Olive', it: 'Oliva' } },
];

export const DEFAULT_MONO_HUE = '#64748b';

export function normalizeThemeStyle(value: unknown): ThemeStyle {
  return typeof value === 'string' && (THEME_STYLE_LIST as string[]).includes(value)
    ? (value as ThemeStyle)
    : 'classic';
}

export function normalizeMonoHue(value: unknown): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return DEFAULT_MONO_HUE;
}

export function mixHex(hex1: string, hex2: string, weight: number): string {
  const h1 = hex1.replace('#', '');
  const h2 = hex2.replace('#', '');
  const r1 = parseInt(h1.slice(0, 2), 16);
  const g1 = parseInt(h1.slice(2, 4), 16);
  const b1 = parseInt(h1.slice(4, 6), 16);
  const r2 = parseInt(h2.slice(0, 2), 16);
  const g2 = parseInt(h2.slice(2, 4), 16);
  const b2 = parseInt(h2.slice(4, 6), 16);
  const r = Math.round(r1 * (1 - weight) + r2 * weight);
  const g = Math.round(g1 * (1 - weight) + g2 * weight);
  const b = Math.round(b1 * (1 - weight) + b2 * weight);
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const rgb = [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function getBestContrastText(bgHex: string): string {
  return getRelativeLuminance(bgHex) > 0.42 ? '#090e17' : '#ffffff';
}

export function getMonoVariables(baseHex: string, mode: Theme): Record<string, string> {
  const safeHex = normalizeMonoHue(baseHex);
  let appBg: string;
  let surfaceBg: string;
  let insetBg: string;
  let hoverBg: string;
  let cardBg: string;
  let pillBg: string;
  let borderCol: string;
  let textMain: string;
  let textMuted: string;
  let accent: string;
  let intakeBg: string;
  let intakeText: string;
  let burnedBg: string;
  let burnedText: string;
  let badgeBg: string;
  let badgeText: string;

  if (mode === 'light') {
    appBg = mixHex('#f8fafc', safeHex, 0.14);
    surfaceBg = '#ffffff';
    insetBg = mixHex('#f1f5f9', safeHex, 0.18);
    hoverBg = mixHex('#e2e8f0', safeHex, 0.24);
    cardBg = mixHex('#ffffff', safeHex, 0.16);
    pillBg = mixHex('#f1f5f9', safeHex, 0.22);
    borderCol = mixHex('#cbd5e1', safeHex, 0.35);
    textMain = '#090e17';
    textMuted = '#1e293b';
    accent = mixHex(safeHex, '#090e17', 0.22);
    intakeBg = mixHex(safeHex, '#090e17', 0.32);
    intakeText = getBestContrastText(intakeBg);
    burnedBg = mixHex(safeHex, '#090e17', 0.08);
    burnedText = getBestContrastText(burnedBg);
    badgeBg = '#090e17';
    badgeText = '#ffffff';
  } else if (mode === 'lite-dark') {
    appBg = mixHex('#181d29', safeHex, 0.24);
    surfaceBg = mixHex('#242b3b', safeHex, 0.28);
    insetBg = mixHex('#1c2230', safeHex, 0.26);
    hoverBg = mixHex('#2f384d', safeHex, 0.32);
    cardBg = mixHex('#2e374a', safeHex, 0.32);
    pillBg = mixHex('#151a26', safeHex, 0.22);
    borderCol = mixHex('#64748b', safeHex, 0.45);
    textMain = '#ffffff';
    textMuted = '#e2e8f0';
    accent = mixHex(safeHex, '#ffffff', 0.34);
    intakeBg = mixHex(safeHex, '#ffffff', 0.42);
    intakeText = getBestContrastText(intakeBg);
    burnedBg = mixHex(safeHex, '#ffffff', 0.16);
    burnedText = getBestContrastText(burnedBg);
    badgeBg = 'rgba(9, 14, 23, 0.65)';
    badgeText = '#ffffff';
  } else {
    appBg = mixHex('#090d16', safeHex, 0.16);
    surfaceBg = mixHex('#131926', safeHex, 0.2);
    insetBg = mixHex('#0e131f', safeHex, 0.18);
    hoverBg = mixHex('#1e2638', safeHex, 0.24);
    cardBg = mixHex('#1a2233', safeHex, 0.24);
    pillBg = mixHex('#0c111c', safeHex, 0.18);
    borderCol = mixHex('#334155', safeHex, 0.35);
    textMain = '#f8fafc';
    textMuted = '#cbd5e1';
    accent = mixHex(safeHex, '#ffffff', 0.25);
    intakeBg = mixHex(safeHex, '#ffffff', 0.28);
    intakeText = getBestContrastText(intakeBg);
    burnedBg = mixHex(safeHex, '#090d16', 0.05);
    burnedText = getBestContrastText(burnedBg);
    badgeBg = 'rgba(0, 0, 0, 0.45)';
    badgeText = '#ffffff';
  }

  const cardText = getBestContrastText(cardBg);
  const pillText = getBestContrastText(pillBg);
  const dock6Bg = cardBg;
  const dock6Text = cardText;
  const intakeTrack = intakeText === '#ffffff' ? 'rgba(255,255,255,0.28)' : 'rgba(9,14,23,0.22)';
  const burnedTrack = burnedText === '#ffffff' ? 'rgba(255,255,255,0.28)' : 'rgba(9,14,23,0.22)';

  return {
    '--mono-accent': accent,
    '--bg': appBg,
    '--surface': surfaceBg,
    '--surface-solid': surfaceBg,
    '--inset': insetBg,
    '--hover': hoverBg,
    '--border': borderCol,
    '--text': textMain,
    '--muted': textMuted,
    '--brand-flame-color': accent,
    '--header-btn-bg': surfaceBg,
    '--header-icon-color': textMain,
    '--nav-bg': surfaceBg,
    '--nav-inactive-color': textMuted,
    '--nav-active-bg': accent,
    '--nav-active-color': getBestContrastText(accent),
    '--meal-icon-color': accent,
    '--card-border': `1.5px solid ${borderCol}`,
    '--intake-bg': intakeBg,
    '--intake-text': intakeText,
    '--intake-label': intakeText,
    '--intake-track': intakeTrack,
    '--intake-fill': intakeText,
    '--intake-badge-bg': intakeText,
    '--intake-badge-text': intakeBg,
    '--burned-bg': burnedBg,
    '--burned-text': burnedText,
    '--burned-label': burnedText,
    '--burned-track': burnedTrack,
    '--burned-fill': burnedText,
    '--badge-bg': badgeBg,
    '--badge-text': badgeText,
    '--carbs-bg': cardBg,
    '--carbs-text': cardText,
    '--protein-bg': cardBg,
    '--protein-text': cardText,
    '--fat-bg': cardBg,
    '--fat-text': cardText,
    '--pill-c-bg': pillBg,
    '--pill-c-text': pillText,
    '--pill-p-bg': pillBg,
    '--pill-p-text': pillText,
    '--pill-f-bg': pillBg,
    '--pill-f-text': pillText,
    '--dock-bg': surfaceBg,
    '--dock-border': `1.5px solid ${borderCol}`,
    // Mono: Food and Movement use the same plate as every other button (they used to be the stronger intake / burned colours).
    '--dock-1': cardBg,
    '--dock-icon-1': cardText,
    '--dock-2': cardBg,
    '--dock-icon-2': cardText,
    '--dock-3': cardBg,
    '--dock-icon-3': cardText,
    '--dock-4': cardBg,
    '--dock-icon-4': cardText,
    '--dock-5': cardBg,
    '--dock-icon-5': cardText,
    '--dock-6': dock6Bg,
    '--dock-icon-6': dock6Text,
    '--fiber-bg': dock6Bg,
    '--fiber-text': dock6Text,
    '--salt-bg': dock6Bg,
    '--salt-text': dock6Text,
    '--sugar-bg': dock6Bg,
    '--sugar-text': dock6Text,
    '--color-nutrient': dock6Bg,
    '--color-nutrient-ink': dock6Text,
    '--color-intake': intakeBg,
    '--color-intake-ink': intakeText,
    '--color-intake-accent': intakeText,
    '--color-intake-soft': intakeTrack,
    '--color-activity': burnedBg,
    '--color-activity-ink': burnedText,
    '--color-activity-accent': burnedText,
    '--color-activity-soft': burnedTrack,
    '--color-activity-border': borderCol,
    '--color-activity-hover': hoverBg,
    '--color-weight': cardBg,
    '--color-weight-ink': cardText,
    '--color-weight-accent': accent,
    '--color-weight-soft': pillBg,
  };
}

const MONO_VAR_KEYS = Object.keys(getMonoVariables(DEFAULT_MONO_HUE, 'light'));

export function applyThemeAttributes(
  theme: Theme,
  themeStyle: ThemeStyle = 'classic',
  monoHue: string = DEFAULT_MONO_HUE
): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-style', themeStyle);

  if (themeStyle === 'mono') {
    const vars = getMonoVariables(monoHue, theme);
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  } else {
    for (const k of MONO_VAR_KEYS) {
      root.style.removeProperty(k);
    }
  }

  // Clear any inline backgroundColor left by pre-paint script so CSS rules govern --bg.
  root.style.removeProperty('background-color');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const computedBg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (computedBg) meta.setAttribute('content', computedBg);
  }
}
