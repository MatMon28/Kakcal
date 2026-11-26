import { parseOffCatalog, type CatalogLang, type OffCatalog } from '../data/offCatalog';
import type { FoodCategory, FoodItem } from '../types';

/**
 * Queries the offline Open Food Facts catalogue (public/data/off-foods.bin) off the main thread:
 * search, barcode lookup, batch barcode resolution, and paginated Browse Foods.
 *
 * The first message of any kind that needs the data starts the download (`url` is sent with every
 * request because a worker has no `document.baseURI`). Requests that arrive while the file is still
 * loading wait for the shared download promise. See src/utils/catalogueSearch.ts for the client.
 */

export type CatalogueRequest =
  | { type: 'search'; id: number; query: string; limit: number; lang?: CatalogLang; url: string }
  | { type: 'barcode'; id: number; code: string; url: string }
  | { type: 'barcodes'; id: number; codes: string[]; url: string }
  | {
    type: 'browse';
    id: number;
    query: string;
    category: FoodCategory | null;
    excluded: number[];
    offset: number;
    limit: number;
    lang?: CatalogLang;
    url: string;
  };

export type CatalogueReply =
  | { type: 'results'; id: number; foods: FoodItem[] }
  | { type: 'barcodeResult'; id: number; food: FoodItem | null }
  | { type: 'barcodesResult'; id: number; foods: FoodItem[] }
  | { type: 'browseResult'; id: number; total: number; foods: FoodItem[] }
  | { type: 'failed'; id: number; message: string };

// The project compiles with the DOM lib, so the few worker members used here are declared by hand.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CatalogueRequest>) => void) | null;
  postMessage(message: CatalogueReply): void;
};

let loading: Promise<OffCatalog> | null = null;
let lastBrowse: { key: string; handle: ReturnType<OffCatalog['browse']> } | null = null;

function load(url: string): Promise<OffCatalog> {
  if (!loading) {
    loading = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then(parseOffCatalog)
      .catch((error) => {
        loading = null; // a later request may try again
        throw error;
      });
  }
  return loading;
}

scope.onmessage = (event) => {
  const req = event.data;
  load(req.url)
    .then((catalog) => {
      if (req.type === 'search') {
        scope.postMessage({ type: 'results', id: req.id, foods: catalog.search(req.query, req.limit, req.lang) });
      } else if (req.type === 'barcode') {
        scope.postMessage({ type: 'barcodeResult', id: req.id, food: catalog.findByBarcode(req.code) });
      } else if (req.type === 'barcodes') {
        const foods: FoodItem[] = [];
        for (const code of req.codes) {
          const item = catalog.findByBarcode(code);
          if (item) foods.push(item);
        }
        scope.postMessage({ type: 'barcodesResult', id: req.id, foods });
      } else {
        const key = `${req.query}|${req.category ?? ''}|${req.lang ?? ''}|${req.excluded.join(',')}`;
        if (!lastBrowse || lastBrowse.key !== key) {
          lastBrowse = {
            key,
            handle: catalog.browse(req.query, req.category, new Set(req.excluded), req.lang),
          };
        }
        scope.postMessage({
          type: 'browseResult',
          id: req.id,
          total: lastBrowse.handle.count,
          foods: lastBrowse.handle.page(req.offset, req.limit),
        });
      }
    })
    .catch((error) => scope.postMessage({ type: 'failed', id: req.id, message: String(error) }));
};
