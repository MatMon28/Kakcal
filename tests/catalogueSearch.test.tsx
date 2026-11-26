import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseOffCatalog } from '../src/data/offCatalog';
import {
  buildKoffV2Buffer,
  REGION_EU,
  REGION_IT,
  REGION_UK,
  REGION_US,
  type BuilderFoodRecord,
} from '../scripts/build-off-catalog.mjs';

let file: ArrayBuffer;

const SAMPLE_FOODS: BuilderFoodRecord[] = [
  {
    code: '8000500310427',
    name: 'Nutella Crema Spalmabile',
    brand: 'Ferrero',
    kcal: 539,
    fat: 30.9,
    carbs: 57.5,
    sugar: 56.3,
    protein: 6.3,
    fiber: 3.4,
    salt: 0.107,
    portion: 15,
    ml: false,
    cat: 10,
    regionMask: REGION_IT | REGION_EU,
    score: 900,
  },
  {
    code: '0009800800056',
    name: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    kcal: 530,
    fat: 30,
    carbs: 58,
    sugar: 56,
    protein: 6,
    fiber: 3,
    salt: 0.1,
    portion: 37,
    ml: false,
    cat: 10,
    regionMask: REGION_US,
    score: 880,
  },
  {
    code: '8076809513753',
    name: 'Pasta Spaghetti n.5',
    brand: 'Barilla',
    kcal: 359,
    fat: 2,
    carbs: 71.2,
    sugar: 3.5,
    protein: 12.5,
    fiber: 3,
    salt: 0.01,
    portion: 85,
    ml: false,
    cat: 2,
    regionMask: REGION_IT,
    score: 850,
  },
  {
    code: '0076808280085',
    name: 'Pasta Classic Spaghetti',
    brand: 'Barilla',
    kcal: 357,
    fat: 1.8,
    carbs: 75,
    sugar: 3.6,
    protein: 12.5,
    fiber: 3.6,
    salt: 0,
    portion: 56,
    ml: false,
    cat: 2,
    regionMask: REGION_US,
    score: 840,
  },
  {
    code: '0501234567890',
    name: 'Chicken Breast Slices',
    brand: 'Sainsbury',
    kcal: 110,
    fat: 1.5,
    carbs: 0.5,
    sugar: 0.5,
    protein: 24,
    fiber: 0,
    salt: 1.1,
    portion: 50,
    ml: false,
    cat: 4,
    regionMask: REGION_UK,
    score: 700,
  },
  {
    code: '12345678',
    name: 'Chicken Broth Organic',
    brand: 'Knorr',
    kcal: 12,
    fat: 0.2,
    carbs: 1.2,
    sugar: 0.4,
    protein: 1.1,
    fiber: 0,
    salt: 0.8,
    portion: 250,
    ml: true,
    cat: 1,
    regionMask: REGION_EU,
    score: 650,
  },
];

beforeAll(() => {
  file = buildKoffV2Buffer(SAMPLE_FOODS).buffer;
});

const fetchStub = () => vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => file.slice(0) }));
let posted: unknown[] = [];

/** A Worker that runs the real worker module in this thread and answers through `onmessage`. */
async function installFakeWorker() {
  posted = [];
  const spy = vi.spyOn(self, 'postMessage').mockImplementation(((message: unknown) => {
    queueMicrotask(() => (instance as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage({ data: message }));
  }) as typeof self.postMessage);
  await import('../src/workers/offCatalogSearch.worker');
  const handler = (self as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage;
  let instance: unknown;
  class FakeWorker {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { instance = this; }
    postMessage(request: unknown) { posted.push(request); handler({ data: request }); }
    terminate() {}
  }
  vi.stubGlobal('Worker', FakeWorker);
  return spy;
}

beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', fetchStub()); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('catalogue search, browse and barcode off the main thread', () => {
  it('asks the worker, returns what the catalogue returns, and caches the answer', async () => {
    await installFakeWorker();
    const { searchCatalogue, peekCatalogueSearch } = await import('../src/utils/catalogueSearch');
    const direct = parseOffCatalog(file).search('nutella', 40, 'it');
    expect(direct.length).toBe(2);
    expect(direct[0].id).toBe('off-8000500310427'); // Italian product boosted for 'it'
    expect(peekCatalogueSearch('nutella', 40, 'it')).toBeUndefined();

    const first = await searchCatalogue('nutella', 40, 'it');
    expect(first.map((f) => f.id)).toEqual(direct.map((f) => f.id));
    expect(posted).toHaveLength(1);

    const again = await searchCatalogue('  NUTELLA ', 40, 'it');
    expect(again).toBe(first);
    expect(posted).toHaveLength(1); // served from the cache
    expect(peekCatalogueSearch('nutella', 40, 'it')).toBe(first);
  });

  it('supports barcode lookup and paginated browse inside the worker', async () => {
    await installFakeWorker();
    const { findCatalogueBarcode, findCatalogueBarcodes, browseCatalogue } = await import('../src/utils/catalogueSearch');

    const hit = await findCatalogueBarcode('8076809513753');
    expect(hit?.id).toBe('off-8076809513753');

    // UPC-A 12-digit lookup matches 13-digit EAN with leading zero
    const upc = await findCatalogueBarcode('009800800056');
    expect(upc?.id).toBe('off-0009800800056');

    const batch = await findCatalogueBarcodes(['12345678', '0501234567890']);
    expect(batch.map((f) => f.id)).toEqual(['off-12345678', 'off-0501234567890']);

    const page1 = await browseCatalogue({
      query: '',
      category: null,
      excluded: [12345678],
      offset: 0,
      limit: 2,
      lang: 'en',
    });
    expect(page1?.total).toBe(5);
    expect(page1?.foods.map((f) => f.id)).toEqual(['off-0009800800056', 'off-0076808280085']);

    const page2 = await browseCatalogue({
      query: '',
      category: null,
      excluded: [12345678],
      offset: 2,
      limit: 2,
      lang: 'en',
    });
    expect(page2?.total).toBe(5);
    expect(page2?.foods).toHaveLength(2);
    expect(page2?.foods[0].id).toBe('off-0501234567890');
  });

  it('runs the same search and browse on the main thread when workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { searchCatalogue, findCatalogueBarcode, browseCatalogue } = await import('../src/utils/catalogueSearch');
    const direct = parseOffCatalog(file).search('pasta', 20, 'en');
    expect((await searchCatalogue('pasta', 20, 'en')).map((f) => f.id)).toEqual(direct.map((f) => f.id));
    expect((await findCatalogueBarcode('8000500310427'))?.id).toBe('off-8000500310427');
    const browsed = await browseCatalogue({ query: 'pasta', category: null, excluded: [], offset: 0, limit: 10, lang: 'en' });
    expect(browsed?.total).toBe(2);
  });

  it('answers [] / null when the catalogue cannot be loaded', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { searchCatalogue, findCatalogueBarcode, browseCatalogue } = await import('../src/utils/catalogueSearch');
    expect(await searchCatalogue('pasta', 20)).toEqual([]);
    expect(await findCatalogueBarcode('8000500310427')).toBeNull();
    expect(await browseCatalogue({ query: '', category: null, excluded: [], offset: 0, limit: 10 })).toBeNull();
  });

  it('the hook stays idle below two characters, then reports pending and results', async () => {
    await installFakeWorker();
    const { useCatalogueSearch } = await import('../src/utils/useCatalogueSearch');
    const { result, rerender } = renderHook(({ q }) => useCatalogueSearch(q, true, 30, 'it'), { initialProps: { q: 'n' } });
    expect(result.current).toEqual({ foods: [], pending: false });
    await new Promise((r) => setTimeout(r, 150));
    expect(posted).toHaveLength(0); // nothing is downloaded or searched for one character

    rerender({ q: 'nutella' });
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.foods.length).toBeGreaterThan(0);
    expect(posted).toHaveLength(1);

    rerender({ q: 'x' });
    expect(result.current).toEqual({ foods: [], pending: false });
  });

  it('a burst of keystrokes causes one search (debounce)', async () => {
    await installFakeWorker();
    const { useCatalogueSearch } = await import('../src/utils/useCatalogueSearch');
    const { rerender, result } = renderHook(({ q }) => useCatalogueSearch(q, true, 30, 'en'), { initialProps: { q: 'ch' } });
    for (const q of ['chi', 'chic', 'chick', 'chicken']) rerender({ q });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(posted).toHaveLength(1);
  });
});
