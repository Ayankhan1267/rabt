self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Rabt Naturals'
  const options = {
    body: data.body || 'New notification',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: data.type === 'consultation',
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
  if (event.action === 'accept') {
    event.waitUntil(clients.openWindow('/specialist-dashboard'))
  } else {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
  }
})