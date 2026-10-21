'use strict';
// Guarda la app en el celular para que abra sin internet.
// Al publicar una versión nueva, cambia VERSION para que los celulares descarguen los archivos nuevos.
const VERSION = 'control-gastos-v1';
const ARCHIVOS = [
  './', 'index.html', 'estilos.css', 'datos.js', 'app.js', 'pantallas.js', 'manifest.webmanifest',
  'iconos/portada.svg', 'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/apple-touch-icon.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero intenta la red (para recibir actualizaciones); si no hay internet, usa la copia guardada.
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request)
      .then(r => {
        const copia = r.clone();
        caches.open(VERSION).then(c => c.put(ev.request, copia));
        return r;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))),
  );
});

// Al tocar un recordatorio se abre (o se trae al frente) la app.
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  ev.waitUntil(self.clients.matchAll({ type: 'window' }).then(ventanas =>
    ventanas.length ? ventanas[0].focus() : self.clients.openWindow('./')));
});
