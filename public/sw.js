const CACHE_NAME = 'rabt-hq-v1'
const STATIC_ASSETS = ['/', '/specialist-dashboard', '/offline.html']

// Install — cache static assets
self.addEventListener('install', function(event) {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/offline.html']).catch(() => {}))
  )
})

// Activate — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network first, fallback to cache, then offline page
self.addEventListener('fetch', function(event) {
  // Skip non-GET and API calls (always fresh)
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Cache successful page navigations
        if (res.ok && event.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match('/offline.html')
        )
      )
  )
})

// Push notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Rabt HQ'
  const options = {
    body: data.body || 'New notification',
    icon: '/api/pwa-icon?size=192',
    badge: '/api/pwa-icon?size=96',
    vibrate: [200, 100, 200],
    requireInteraction: data.type === 'consultation',
    tag: data.type + '-' + Date.now(),
    renotify: false,
    data: { url: data.url || '/specialist-dashboard', type: data.type },
    actions: data.type === 'consultation' ? [
      { action: 'accept', title: 'Accept' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : []
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.action === 'accept'
    ? '/specialist-dashboard?tab=consultations'
    : (event.notification.data?.url || '/specialist-dashboard')
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes('specialist-dashboard'))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
