const CACHE = 'dt-v5';
const ASSETS = [
  './','index.html','styles.css','app.js','manifest.webmanifest',
  'icons/icon-192-bright.png','icons/icon-512-bright.png','icons/maskable-512-bright.png'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()))
);
self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE && caches.delete(k)))).then(()=>self.clients.claim()))
);
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(r => r || fetch(e.request)))
);
