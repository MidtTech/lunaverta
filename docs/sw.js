// LunaVerta service worker: keeps the app working offline.
// The app shell is stored on install; helper libraries are stored the first time they are used.
const VERSION = '2f62f4abae';
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
    .then(keys => Promise.all(keys.filter(k => k.startsWith('lunaverta-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Pages: network first so updates show up, cached copy when offline.
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // Everything else: cache first, then network (and remember it for next time).
  // Asset addresses carry ?v=<version>, so a new version is a new address.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Promise.reject(new Error('offline'))))));
});
