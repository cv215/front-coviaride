/*
 * Service worker CoviaRide : affiche les notifications push même quand
 * l'application est fermée (nouvelle annonce de trajet, demande de voyage,
 * réservation acceptée…) et ouvre la bonne page au clic.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'CoviaRide';
  const options = {
    body: data.body || '',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const cible = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (f.url.startsWith(self.location.origin) && 'focus' in f) {
        await f.focus();
        if ('navigate' in f) { try { await f.navigate(cible); } catch (e) { /* page d'une autre origine */ } }
        return;
      }
    }
    await self.clients.openWindow(cible);
  })());
});
