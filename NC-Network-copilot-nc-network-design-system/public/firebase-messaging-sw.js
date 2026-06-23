importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

// Parse configuration from the script's URL query parameter.
// If not provided or fails to parse, we fall back to the hardcoded default config.
const urlParams = new URLSearchParams(self.location.search);
const configParam = urlParams.get('config');

const defaultFirebaseConfig = {
  apiKey: "AIzaSyCdJ4qLa1jksuCQIMd7hRii5mgx1l5h48E",
  authDomain: "nc-network-10d0b.firebaseapp.com",
  projectId: "nc-network-10d0b",
  storageBucket: "nc-network-10d0b.firebasestorage.app",
  messagingSenderId: "825161490464",
  appId: "1:825161490464:web:c74f7a95bc4e5de6729c45",
  databaseURL: "https://nc-network-10d0b-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

if (configParam) {
  try {
    const firebaseConfig = JSON.parse(decodeURIComponent(configParam));
    firebase.initializeApp(firebaseConfig);
    console.log('[firebase-messaging-sw.js] Initialized with dynamic config');
  } catch (e) {
    console.error('[firebase-messaging-sw.js] Failed to parse dynamic config, falling back to default:', e);
    firebase.initializeApp(defaultFirebaseConfig);
  }
} else {
  console.log('[firebase-messaging-sw.js] No config query param, using hardcoded default config');
  firebase.initializeApp(defaultFirebaseConfig);
}

const formatMessagePreview = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('/video/')) {
      return '🎥 Sent a video';
    }
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('/image/') || lower.includes('cloudinary')) {
      return '📷 Sent a photo';
    }
    return '🔗 Sent a link';
  }
  return text;
};

const resolveLinkToPath = (link) => {
  if (!link) return '/';
  if (link.startsWith('/') || link.startsWith('http://') || link.startsWith('https://')) return link;
  
  // Parse format "pageName" or "pageName:paramValue"
  let page = link;
  let param = null;
  if (link.includes(':')) {
    const parts = link.split(':');
    page = parts[0];
    param = parts[1];
  }
  
  switch (page) {
    case 'home': return '/';
    case 'listing': return '/talents';
    case 'profile': return param ? `/profile/${param}` : '/talents';
    case 'casting': return '/casting';
    case 'casting-detail': return `/casting/${param}`;
    case 'signin': return '/signin';
    case 'signup': return '/signup';
    case 'profile-create': return '/profile/create';
    case 'casting-create': return '/casting/create';
    case 'premium': return '/premium';
    case 'messages': return param ? `/messages/${param}` : '/messages';
    case 'notifications': return '/notifications';
    case 'settings': return param ? `/settings?tab=${param}` : '/settings';
    case 'privacy': return '/privacy';
    case 'terms': return '/terms';
    case 'trust': return '/trust-safety';
    default: return '/' + page;
  }
};

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const isCall = payload.data?.type === 'incoming_call';
  const notificationTitle = isCall 
    ? `Incoming Call` 
    : (payload.notification?.title || 'New Notification');

  const link = payload.data?.link;
  const resolvedLink = resolveLinkToPath(link);

  let notificationOptions = {};

  if (isCall) {
    const callerName = payload.data?.callerName || 'Someone';
    const callType = payload.data?.callType || 'audio';
    notificationOptions = {
      body: `Incoming ${callType} call from ${callerName}`,
      icon: payload.data?.callerAvatar || '/logo.png',
      tag: `call_${payload.data?.callId}`,
      requireInteraction: true,
      renotify: true,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' }
      ],
      data: {
        ...payload.data,
        link: resolvedLink
      }
    };
  } else {
    notificationOptions = {
      body: formatMessagePreview(payload.notification?.body),
      icon: payload.notification?.icon || '/logo.png',
      data: {
        ...payload.data,
        link: resolvedLink
      }
    };
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If the user declined the call, stop here
  if (event.action === 'decline') {
    console.log('[firebase-messaging-sw.js] Call declined by user');
    return;
  }

  const relativeLink = event.notification.data?.link || '/';
  
  // Resolve relative link to an absolute URL on the same origin
  const urlToOpen = new URL(relativeLink, self.location.origin).toString();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Try to find a window already open on the exact path and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientUrl = new URL(client.url, self.location.origin).toString();
        if (clientUrl === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 2. If no exact match but a site tab is open, navigate it to the link and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('navigate' in client && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // 3. Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
