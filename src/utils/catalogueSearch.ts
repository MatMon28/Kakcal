import type { FoodCategory, FoodItem } from '../types';
import { loadOffCatalog, normalizeSearch, type CatalogLang } from '../data/offCatalog';
import type { CatalogueReply, CatalogueRequest } from '../workers/offCatalogSearch.worker';

/**
 * Asynchronous client for the offline Open Food Facts catalogue, run in a single Web Worker so
 * neither typing nor Browse Foods / Barcode Lookup ever parses a second copy on the main thread.
 *
 * - The worker (src/workers/offCatalogSearch.worker.ts) downloads and parses the file on demand.
 * - Finished text searches are cached here (normalized query + limit + language), so backspacing or
 *   retyping is instant and a dialog reopened with the same text does not search again.
 * - If workers are unavailable or the worker script fails to load, the same calls run on the main
 *   thread through `loadOffCatalog()`.
 */

const CACHE_SIZE = 60;
const cache = new Map<string, FoodItem[]>();
const inflight = new Map<string, Promise<FoodItem[]>>();

const keyOf = (query: string, limit: number, lang?: CatalogLang) =>
  `${limit}|${lang ?? ''}|${normalizeSearch(query)}`;

/** The cached result of an earlier identical search, or undefined. */
export const peekCatalogueSearch = (query: string, limit: number, lang?: CatalogLang): FoodItem[] | undefined =>
  cache.get(keyOf(query, limit, lang));

type Pending = { resolve: (reply: CatalogueReply) => void; reject: (error: Error) => void };
const waiting = new Map<number, Pending>();
let nextId = 1;
let worker: Worker | null | undefined; // undefined: not tried yet, null: not available

function dropWorker(reason: string) {
  worker?.terminate();
  worker = null;
  const pending = Array.from(waiting.values());
  waiting.clear();
  pending.forEach((p) => p.reject(new Error(reason)));
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === 'undefined') return worker;
  try {
    const created = new Worker(new URL('../workers/offCatalogSearch.worker.ts', import.meta.url), { type: 'module' });
    created.onmessage = (event: MessageEvent<CatalogueReply>) => {
      const reply = event.data;
      const pending = waiting.get(reply.id);
      if (!pending) return;
      waiting.delete(reply.id);
      if (reply.type === 'failed') pending.reject(new Error(reply.message));
      else pending.resolve(reply);
    };
    created.onerror = () => dropWorker('Catalogue worker failed');
    worker = created;
  } catch {
    worker = null;
  }
  return worker;
}

const baseUrl = () => new URL('data/off-foods.bin', document.baseURI).href;

async function callWorker<R extends CatalogueReply>(
  build: (id: number, url: string) => CatalogueRequest,
  fallback: () => Promise<R>,
): Promise<R> {
  const target = getWorker();
  if (!target) return fallback();
  return new Promise<CatalogueReply>((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    target.postMessage(build(id, baseUrl()));
  })
    .then((reply) => reply as R)
    .catch((error: Error) => {
      if (worker === null) return fallback();
      throw error;
    });
}

async function requireMainCatalog() {
  const catalog = await loadOffCatalog();
  if (!catalog) throw new Error('Offline food catalogue unavailable');
  return catalog;
}

/** Catalogue foods matching `query` (word-prefix search, best first). Resolves to [] when unavailable. */
export function searchCatalogue(query: string, limit: number, lang?: CatalogLang): Promise<FoodItem[]> {
  if (!normalizeSearch(query)) return Promise.resolve([]);
  const key = keyOf(query, limit, lang);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let running = inflight.get(key);
  if (!running) {
    running = callWorker(
      (id, url) => ({ type: 'search', id, query, limit, lang, url }),
      async () => {
        const catalog = await requireMainCatalog();
        return { type: 'results', id: 0, foods: catalog.search(query, limit, lang) };
      },
    )
      .then((reply) => {
        const foods = reply.type === 'results' ? reply.foods : [];
        cache.set(key, foods); // an empty answer is cached too: the catalogue was reachable, nothing matched
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
        return foods;
      })
      .catch((): FoodItem[] => []) // unavailable catalogue: the bundled foods are enough, a later search may retry
      .finally(() => { inflight.delete(key); });
    inflight.set(key, running);
  }
  return running;
}

/** Looks up one barcode in the offline catalogue inside the worker. Resolves to null if missing/unavailable. */
export async function findCatalogueBarcode(code: string): Promise<FoodItem | null> {
  try {
    const reply = await callWorker(
      (id, url) => ({ type: 'barcode', id, code, url }),
      async () => {
        const catalog = await requireMainCatalog();
        return { type: 'barcodeResult', id: 0, food: catalog.findByBarcode(code) };
      },
    );
    return reply.type === 'barcodeResult' ? reply.food : null;
  } catch {
    return null;
  }
}

/** Resolves a list of barcodes from the offline catalogue inside the worker. */
export async function findCatalogueBarcodes(codes: string[]): Promise<FoodItem[]> {
  if (codes.length === 0) return [];
  try {
    const reply = await callWorker(
      (id, url) => ({ type: 'barcodes', id, codes, url }),
      async () => {
        const catalog = await requireMainCatalog();
        const foods: FoodItem[] = [];
        for (const code of codes) {
          const item = catalog.findByBarcode(code);
          if (item) foods.push(item);
        }
        return { type: 'barcodesResult', id: 0, foods };
      },
    );
    return reply.type === 'barcodesResult' ? reply.foods : [];
  } catch {
    return [];
  }
}

/** Browses and paginates the offline catalogue inside the worker. Returns null if the file failed to load. */
export async function browseCatalogue(params: {
  query: string;
  category: FoodCategory | null;
  excluded: number[];
  offset: number;
  limit: number;
  lang?: CatalogLang;
}): Promise<{ total: number; foods: FoodItem[] } | null> {
  try {
    const reply = await callWorker(
      (id, url) => ({ type: 'browse', id, ...params, url }),
      async () => {
        const catalog = await requireMainCatalog();
        const handle = catalog.browse(params.query, params.category, new Set(params.excluded), params.lang);
        return { type: 'browseResult', id: 0, total: handle.count, foods: handle.page(params.offset, params.limit) };
      },
    );
    return reply.type === 'browseResult' ? { total: reply.total, foods: reply.foods } : null;
  } catch {
    return null;
  }
}
