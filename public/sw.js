// public/sw.js
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.message,
      icon: '/icon-192x192.png', // Certifique-se de ter este ícone
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.link || '/dashboard',
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

// Força o SW a se tornar ativo imediatamente
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Assume o controle das abas abertas imediatamente
});
