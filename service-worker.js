const CACHE_VERSION = 'chem-v1';
const APP_SHELL = [
  './', './index.html', './chemistry.html', './chemistry-tools.html', './element.html',
  './quiz.html', './flashcards.html', './calculator.html', './trends.html', './molecules.html', './auth.html', './privacy.html', './offline.html',
  './css/base.css', './css/layout.css', './css/components.css', './css/pages.css', './css/learning.css', './css/calculator.css', './css/visualization.css', './css/pwa.css', './css/styles.css',
  './js/main.js', './js/site.js', './js/i18n.js', './js/progress.js', './js/supabase.js', './js/auth.js', './js/comments.js', './js/periodic.js', './js/tools.js', './js/element.js', './js/quiz.js', './js/flashcards.js', './js/calculator.js', './js/trends.js', './js/molecules.js', './js/config.example.js',
  './data/elements.json', './data/tools.json', './data/quiz.json', './data/molecules.json', './manifest.webmanifest', './sitemap.xml', './robots.txt', './icons/icon-192.svg', './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.json')) {
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)); return response; }).catch(() => caches.match(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => response).catch(() => caches.match(request).then((cached) => cached || caches.match('./offline.html'))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { const copy = response.clone(); caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)); return response; })));
});
