// sw.js — Service Worker de MiRoster
// Cachea los archivos de la app para que funcione offline

const CACHE_NAME = 'miroster-v1'

// Archivos a cachear al instalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// INSTALL: guarda los archivos estáticos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ACTIVATE: limpia versiones viejas de caché
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// FETCH: estrategia "Network first, fallback to cache"
// → intenta la red primero; si no hay conexión, sirve desde caché
self.addEventListener('fetch', event => {
  // Las llamadas al backend de Railway van directo a la red (nunca offline)
  if (event.request.url.includes('railway.app')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, actualiza el caché
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Sin red → servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Fallback final: devolver index.html para que React maneje la ruta
          return caches.match('/index.html')
        })
      })
  )
})
