const CACHE_NAME = 'daily-devotion-v3';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// Install: cache core files
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('bible-api') ||
      e.request.url.includes('bolls.life') ||
      e.request.url.includes('anthropic') ||
      e.request.url.includes('openrouter') ||
      e.request.url.includes('fonts.googleapis')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});

// NOTIFICATION: show devotion reminder
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      if (list.length > 0) {
        return list[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});

// MESSAGE: trigger alarm from app
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SCHEDULE_ALARM') {
    var time = e.data.time; // "06:00"
    var now = new Date();
    var parts = time.split(':');
    var target = new Date();
    target.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    var delay = target.getTime() - now.getTime();

    setTimeout(function() {
      self.registration.showNotification('Daily Devotion ✝', {
        body: 'Oras na para sa iyong devotion! 🙏',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'devotion-alarm',
        renotify: true,
        requireInteraction: false
      });
      // Re-schedule for next day
      setInterval(function() {
        self.registration.showNotification('Daily Devotion ✝', {
          body: 'Oras na para sa iyong devotion! 🙏',
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: 'devotion-alarm',
          renotify: true
        });
      }, 24 * 60 * 60 * 1000);
    }, delay);
  }
});
