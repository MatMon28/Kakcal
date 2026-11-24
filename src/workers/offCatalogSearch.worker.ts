import { parseOffCatalog, type OffCatalog } from '../data/offCatalog';
import type { FoodItem } from '../types';

/**
 * Searches the offline Open Food Facts catalogue (public/data/off-foods.bin, about 12 MB) off the main thread.
 *
 * The main thread posts `{ type: 'search', id, query, limit }` and gets `{ type: 'results', id, foods }` back; the
 * first message of any kind that needs the data starts the download (`url` is sent with every search because a
 * worker has no `document.baseURI`). Searches that arrive while the file is still loading simply wait for it.
 * See src/utils/catalogueSearch.ts for the client and docs/search-and-animation-performance.md.
 */

export type CatalogueRequest = { type: 'search'; id: number; query: string; limit: number; url: string };
export type CatalogueReply =
  | { type: 'results'; id: number; foods: FoodItem[] }
  | { type: 'failed'; id: number; message: string };

// The project compiles with the DOM lib, so the few worker members used here are declared by hand.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CatalogueRequest>) => void) | null;
  postMessage(message: CatalogueReply): void;
};
let loading: Promise<OffCatalog> | null = null;

function load(url: string): Promise<OffCatalog> {
  if (!loading) {
    loading = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then(parseOffCatalog)
      .catch((error) => {
        loading = null; // a later search may try again
        throw error;
      });
  }
  return loading;
}

scope.onmessage = (event) => {
  const { id, query, limit, url } = event.data;
  load(url)
    .then((catalog) => scope.postMessage({ type: 'results', id, foods: catalog.search(query, limit) }))
    .catch((error) => scope.postMessage({ type: 'failed', id, message: String(error) }));
};
