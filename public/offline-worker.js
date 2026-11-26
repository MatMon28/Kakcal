// Offline shell worker. Strategy (docs/pwa.md):
//  - Navigations: serve the cached shell immediately, refresh it in the background for the next launch.
//  - /assets/*: hashed, immutable files; cache first (the precache list is stamped in at build time).
//  - Build ids are stamped by vite.config.ts (stampOfflineWorker): `kakcalculator-shell-<time>-<hash>`. The newest TWO
//    caches are kept so a page still running the previous build can lazy-load its own chunks after an update.
const BUILD_ID = '__BUILD_ID__';
const BUILD_ASSETS = [/*__PRECACHE_ASSETS__*/];
const CACHE_PREFIX = 'kakcalculator-shell-';
const CACHE = CACHE_PREFIX + BUILD_ID;
// Static, public food data (the Open Food Facts catalogue). Bump the suffix when it is rebuilt.
const DATA_CACHE = 'kakcalculator-data-v2';
const DATA_CACHE_PREFIX = 'kakcalculator-data-';
const scope = self.registration.scope;
const DATA_FILE = new URL('data/off-foods.bin', scope).href;
const SHELL = new URL('index.html', scope).href;
const ASSET_URLS = BUILD_ASSETS.map((file) => new URL(file, scope).href);
// PWA install assets. Cached best-effort: a missing icon must never make the install of the worker fail.
const PWA_ASSETS = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png'].map((file) => new URL(file, scope).href);
let checkedCatalogue = false;

// Some hosts return index.html with HTTP 200 for a missing binary. Never keep that as food data.
async function isCatalogue(response) {
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) return false;
  const file = await response.clone().blob();
  if (file.size < 112) return false;
  const header = new DataView(await file.slice(0, 112).arrayBuffer());
  return header.getUint32(0, true) === 0x464f464b && header.getUint32(4, true) === 2 &&
    header.getUint32(8, true) > 0 && header.getUint32(108, true) === file.size;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await cache.add(new Request(SHELL, { cache: 'reload' }));
    // Hashed assets are required: a shell without them cannot start, so a failure here fails the install.
    await Promise.all(ASSET_URLS.map((asset) => cache.add(new Request(asset, { cache: 'reload' }))));
    await Promise.all(PWA_ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })).catch(() => undefined)));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => {
    const shells = keys.filter((key) => key.startsWith(CACHE_PREFIX)).sort().reverse(); // newest first
    const keep = new Set(shells.slice(0, 2));
    const staleShells = shells.filter((key) => !keep.has(key));
    const staleData = keys.filter((key) => key.startsWith(DATA_CACHE_PREFIX) && key !== DATA_CACHE);
    return Promise.all([...staleShells, ...staleData].map((key) => caches.delete(key)));
  }).then(() => self.clients.claim()));
});

async function fromAnyShell(url) {
  const current = await caches.open(CACHE);
  return (await current.match(url)) || (await caches.match(url));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.url === DATA_FILE) {
    event.respondWith(caches.open(DATA_CACHE).then(async (cache) => {
      const hit = await cache.match(DATA_FILE);
      if (hit && (checkedCatalogue || await isCatalogue(hit))) { checkedCatalogue = true; return hit; }
      if (hit) await cache.delete(DATA_FILE);
      const response = await fetch(request);
      if (await isCatalogue(response)) {
        try { await cache.put(DATA_FILE, response.clone()); checkedCatalogue = true; }
        catch { /* A full browser cache must not prevent this session from using the catalogue. */ }
      }
      return response;
    }));
    return;
  }
  if (ASSET_URLS.includes(request.url)) {
    // Content-hashed file: cache first, network only when it is somehow missing.
    event.respondWith(fromAnyShell(request.url).then((hit) => hit || fetch(request)));
    return;
  }
  if (PWA_ASSETS.includes(request.url)) {
    // Cache first (instant, works offline), refreshed in the background for the next launch.
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request.url);
      const refresh = fetch(request).then(async (response) => {
        if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
          await cache.put(request.url, response.clone());
        }
        return response;
      });
      if (hit) { refresh.catch(() => undefined); return hit; }
      return refresh;
    }));
    return;
  }
  const url = new URL(request.url);
  const base = new URL(scope);
  if (request.mode !== 'navigate' || url.origin !== base.origin ||
      (url.pathname !== base.pathname && url.pathname !== new URL(SHELL).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(SHELL);
    // Revalidate in the background (a conditional request when the host sends validators, not a full download).
    const refresh = fetch(new Request(SHELL, { cache: 'no-cache' })).then(async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('text/html')) await cache.put(SHELL, response.clone());
      return response;
    });
    if (cached) { event.waitUntil(refresh.catch(() => undefined)); return cached; }
    try { return await refresh; } catch { return Response.error(); }
  })());
});
