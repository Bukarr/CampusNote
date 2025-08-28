self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('campusnote-cache').then(cache => {
      return cache.addAll([
        '',
        'index.html',
        'login.html',
        'manifest.json',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});