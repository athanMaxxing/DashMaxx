/* global self, clients */
// Loaded into the app's service worker (see workbox.importScripts in vite.config.js).
// Shows incoming push notifications and opens DashMaxx when one is tapped.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'DashMaxx', {
      body: data.body || '',
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Reuse an open DashMaxx window if there is one.
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      return clients.openWindow(url)
    }),
  )
})
