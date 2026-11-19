/**
 * Storage sandbox for the guided tour's embedded journal (`?tour=1`).
 *
 * The tour fills its live phone with demo data (see `config/demo.ts`). That data must never reach
 * the real journal, because the tour and the app share one origin and therefore one `localStorage`.
 * So inside the tour iframe `window.localStorage` is replaced by an in-memory copy:
 *
 * - everything the visitor does in the demo phone stays in memory and disappears on reload;
 * - the language and the theme settings are read from the real storage at start, so the demo looks
 *   like the visitor's app;
 * - a language change and a theme change made inside the demo phone are written through to the real
 *   storage (theme fields only), because the tour page follows them via `storage` events.
 *
 * This module must be the first import of `main.tsx` so it runs before any other module reads storage.
 */
const LANG_KEY = 'kcalsync_lang';
const SETTINGS_KEY = 'kcalsync_settings';
/** The only settings that follow the visitor between the tour page and the demo phone. */
const SHARED_SETTINGS = ['theme', 'themeStyle', 'monoHue'] as const;

const IS_TOUR_PREVIEW =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tour') === '1';

function parseObject(raw: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function createSandbox(real: Storage): Storage {
  const memory = new Map<string, string>();

  const lang = real.getItem(LANG_KEY);
  if (lang !== null) memory.set(LANG_KEY, lang);
  const saved = parseObject(real.getItem(SETTINGS_KEY));
  const shared: Record<string, unknown> = {};
  for (const field of SHARED_SETTINGS) if (saved[field] !== undefined) shared[field] = saved[field];
  if (Object.keys(shared).length) memory.set(SETTINGS_KEY, JSON.stringify(shared));

  const writeThrough = (key: string, value: string) => {
    try {
      if (key === LANG_KEY) {
        real.setItem(LANG_KEY, value);
      } else if (key === SETTINGS_KEY) {
        const current = parseObject(real.getItem(SETTINGS_KEY));
        const incoming = parseObject(value);
        let changed = false;
        for (const field of SHARED_SETTINGS) {
          if (incoming[field] !== undefined && incoming[field] !== current[field]) {
            current[field] = incoming[field];
            changed = true;
          }
        }
        if (changed) real.setItem(SETTINGS_KEY, JSON.stringify(current));
      }
    } catch {
      /* storage may be unavailable; the demo keeps working in memory */
    }
  };

  const sandbox = {
    get length() { return memory.size; },
    key: (index: number) => Array.from(memory.keys())[index] ?? null,
    getItem: (key: string) => memory.get(String(key)) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(String(key), String(value));
      writeThrough(String(key), String(value));
    },
    removeItem: (key: string) => { memory.delete(String(key)); },
    clear: () => { memory.clear(); },
  };
  return sandbox as unknown as Storage;
}

function install(): boolean {
  if (!IS_TOUR_PREVIEW) return false;
  try {
    const sandbox = createSandbox(window.localStorage);
    Object.defineProperty(window, 'localStorage', { value: sandbox, configurable: true });
    return window.localStorage === sandbox;
  } catch {
    return false;
  }
}

/**
 * True when this page is the tour's embedded journal and its storage is the in-memory sandbox.
 * Demo data is only ever switched on when this is true (see `config/demo.ts`).
 */
export const TOUR_STORAGE_ISOLATED = install();
