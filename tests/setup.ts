import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom's Blob does not survive fake-indexeddb's structured clone; Node's does (browsers have a native Blob).
globalThis.Blob = NodeBlob as unknown as typeof Blob;

// Node 25+ defines globalThis.localStorage as undefined without --localstorage-file, which breaks jsdom tests.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

if (typeof globalThis.localStorage?.clear !== 'function') {
  const memStorage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== 'undefined' && typeof window.localStorage?.clear !== 'function') {
    Object.defineProperty(window, 'localStorage', {
      value: memStorage,
      configurable: true,
      writable: true,
    });
  }
}
