import type { FoodItem } from '../types';
import { loadOffCatalog, normalizeSearch } from '../data/offCatalog';
import type { CatalogueReply, CatalogueRequest } from '../workers/offCatalogSearch.worker';

/**
 * Asynchronous search of the 130,000-product offline catalogue, run in a Web Worker so that typing in a food
 * search never waits for it (docs/search-and-animation-performance.md).
 *
 * - The worker (src/workers/offCatalogSearch.worker.ts) downloads and parses the file the first time a search
 *   needs it, so nothing is fetched until the user has typed two characters (unchanged rule).
 * - Finished searches are cached here (normalized query + limit), so backspacing or retyping is instant and a
 *   dialog that is reopened with the same text does not search again.
 * - If workers are unavailable or the worker script fails to load, the same search runs on the main thread
 *   through `loadOffCatalog()`, exactly as before this change.
 * - `FoodDatabaseView` (browse) and barcode lookup still use the main-thread catalogue from `data/offCatalog.ts`.
 */

const CACHE_SIZE = 60;
const cache = new Map<string, FoodItem[]>();
const inflight = new Map<string, Promise<FoodItem[]>>();

const keyOf = (query: string, limit: number) => `${limit}|${normalizeSearch(query)}`;

/** The cached result of an earlier identical search, or undefined. */
export const peekCatalogueSearch = (query: string, limit: number): FoodItem[] | undefined => cache.get(keyOf(query, limit));

type Pending = { resolve: (foods: FoodItem[]) => void; reject: (error: Error) => void };
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
      if (reply.type === 'results') pending.resolve(reply.foods);
      else pending.reject(new Error(reply.message));
    };
    created.onerror = () => dropWorker('Catalogue worker failed');
    worker = created;
  } catch {
    worker = null;
  }
  return worker;
}

const baseUrl = () => new URL('data/off-foods.bin', document.baseURI).href;

async function onMainThread(query: string, limit: number): Promise<FoodItem[]> {
  const catalog = await loadOffCatalog();
  if (!catalog) throw new Error('Offline food catalogue unavailable');
  return catalog.search(query, limit);
}

function ask(query: string, limit: number): Promise<FoodItem[]> {
  const target = getWorker();
  if (!target) return onMainThread(query, limit);
  return new Promise<FoodItem[]>((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    const request: CatalogueRequest = { type: 'search', id, query, limit, url: baseUrl() };
    target.postMessage(request);
  }).catch((error: Error) => {
    if (worker === null) return onMainThread(query, limit); // the worker broke: do it here, as before
    throw error;
  });
}

/** Catalogue foods matching `query` (word-prefix search, best first). Resolves to [] when the catalogue is unavailable. */
export function searchCatalogue(query: string, limit: number): Promise<FoodItem[]> {
  if (!normalizeSearch(query)) return Promise.resolve([]);
  const key = keyOf(query, limit);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let running = inflight.get(key);
  if (!running) {
    running = ask(query, limit)
      .then((foods) => {
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
