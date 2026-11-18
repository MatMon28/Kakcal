const CACHE = 'kakcalculator-shell-v1';
const SHELL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(SHELL, { cache: 'reload' })))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) =>
    key.startsWith('kakcalculator-shell-') && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const base = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== base.origin ||
      (url.pathname !== base.pathname && url.pathname !== new URL(SHELL).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
        await cache.put(SHELL, response.clone());
      }
      return response;
    } catch {
      return await cache.match(SHELL) || Response.error();
    }
  })());
});