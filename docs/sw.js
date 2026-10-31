// LunaVerta service worker: keeps the app working offline.
// The app shell is stored on install; helper libraries are stored the first time they are used.
const VERSION = '70f22a7a6f';
const CACHE = 'lunaverta-' + VERSION;
const SHELL = [
  './', 'index.html', 'da/', 'privacy.html', 'licenses.html', 'assets/app.css', 'assets/strings.js', 'assets/i18n.js', 'assets/app.js', 'assets/editor.js', 'assets/pdf-text.js', 'manifest.webmanifest',
  'icons/favicon.svg', 'icons/icon-192.png',
  'fonts/bricolage-grotesque-latin-500-normal.woff2', 'fonts/bricolage-grotesque-latin-700-normal.woff2',
  'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-500-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2',
  'fonts/ibm-plex-mono-latin-400-normal.woff2', 'fonts/ibm-plex-mono-latin-500-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('lunaverta-') && k !== CACHE && k !== 'lunaverta-share').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // "Share to LunaVerta" (Android): the shared files are kept in this device's cache for a moment
  // and the app picks them up. Nothing leaves the device.
  if (req.method === 'POST' && new URL(req.url).pathname === '/share-target') {
    e.respondWith((async () => {
      const form = await req.formData();
      const files = form.getAll('files').filter(f => f && f.name);
      const c = await caches.open('lunaverta-share');
      for (const k of await c.keys()) await c.delete(k);
      await Promise.all(files.map((f, i) => c.put(`/shared/${i}`, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name) } }))));
      return Response.redirect('/?shared=' + files.length, 303);
    })());
    return;
  }
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Pages: network first so updates show up, cached copy when offline.
    // cache: 'no-cache' asks the server every time (a quick "has it changed?"), so a new version shows at once.
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // How-to videos stream straight from the server (range requests), and are not stored for offline use.
  if (new URL(req.url).pathname.startsWith('/videos/')) return;
  // Everything else: cache first, then network (and remember it for next time).
  // Asset addresses carry ?v=<version>, so a new version is a new address.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Promise.reject(new Error('offline'))))));
});
