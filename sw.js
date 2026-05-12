/*
 * Service worker per PWA: installazione Chrome + aggiornamenti.
 * Cambia la riga "build: …" quando pubblichi — così il file cambia byte e i client scaricano il nuovo SW.
 * build: 202605312
 */
self.addEventListener('install', function (event) {
    self.skipWaiting();
});
self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', function (event) {
    event.respondWith(fetch(event.request));
});
