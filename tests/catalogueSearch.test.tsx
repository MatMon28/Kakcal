import { renderHook, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseOffCatalog } from '../src/data/offCatalog';

let file: ArrayBuffer;
beforeAll(() => {
  const buf = fs.readFileSync('public/data/off-foods.bin');
  file = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
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

describe('catalogue search off the main thread', () => {
  it('asks the worker, returns what the catalogue returns, and caches the answer', async () => {
    await installFakeWorker();
    const { searchCatalogue, peekCatalogueSearch } = await import('../src/utils/catalogueSearch');
    const direct = parseOffCatalog(file).search('nutella', 40);
    expect(direct.length).toBeGreaterThan(0);
    expect(peekCatalogueSearch('nutella', 40)).toBeUndefined();

    const first = await searchCatalogue('nutella', 40);
    expect(first.map((f) => f.id)).toEqual(direct.map((f) => f.id));
    expect(posted).toHaveLength(1);

    const again = await searchCatalogue('  NUTELLA ', 40);
    expect(again).toBe(first);
    expect(posted).toHaveLength(1); // served from the cache
    expect(peekCatalogueSearch('nutella', 40)).toBe(first);
  });

  it('runs the same search on the main thread when workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { searchCatalogue } = await import('../src/utils/catalogueSearch');
    const direct = parseOffCatalog(file).search('pasta', 20);
    expect((await searchCatalogue('pasta', 20)).map((f) => f.id)).toEqual(direct.map((f) => f.id));
  });

  it('answers [] when the catalogue cannot be loaded', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { searchCatalogue } = await import('../src/utils/catalogueSearch');
    expect(await searchCatalogue('pasta', 20)).toEqual([]);
  });

  it('the hook stays idle below two characters, then reports pending and results', async () => {
    await installFakeWorker();
    const { useCatalogueSearch } = await import('../src/utils/useCatalogueSearch');
    const { result, rerender } = renderHook(({ q }) => useCatalogueSearch(q, true, 30), { initialProps: { q: 'n' } });
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
    const { rerender, result } = renderHook(({ q }) => useCatalogueSearch(q, true, 30), { initialProps: { q: 'ch' } });
    for (const q of ['chi', 'chic', 'chick', 'chicken']) rerender({ q });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(posted).toHaveLength(1);
  });
});
