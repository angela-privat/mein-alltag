// Zusatz für den Service Worker von „Mein Alltag“:
// Tippen auf eine Benachrichtigung öffnet die App bei den Erinnerungen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenster) => {
      for (const f of fenster) {
        if (f.url.startsWith(self.registration.scope)) {
          f.navigate(ziel).catch(() => {});
          return f.focus();
        }
      }
      return self.clients.openWindow(ziel);
    })
  );
});
