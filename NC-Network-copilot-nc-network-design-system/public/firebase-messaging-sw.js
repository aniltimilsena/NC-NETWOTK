importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

// Parse configuration from the script's URL query parameter
// This allows us to keep keys in .env without hardcoding them in this public file.
const urlParams = new URLSearchParams(self.location.search);
const configParam = urlParams.get('config');

if (configParam) {
  try {
    const firebaseConfig = JSON.parse(decodeURIComponent(configParam));
    firebase.initializeApp(firebaseConfig);
    console.log('[firebase-messaging-sw.js] Initialized with dynamic config');
  } catch (e) {
    console.error('[firebase-messaging-sw.js] Failed to parse dynamic config', e);
  }
} else {
  console.warn('[firebase-messaging-sw.js] No config provided in query params');
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
