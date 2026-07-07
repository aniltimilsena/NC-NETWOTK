importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

// Read config from URL params — no hardcoding
const urlParams = new URLSearchParams(self.location.search);
const configParam = urlParams.get('config');

let firebaseConfig = null;

if (configParam) {
  try {
    firebaseConfig = JSON.parse(decodeURIComponent(configParam));
  } catch (e) {
    // Silent fail
  }
}

if (firebaseConfig && firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

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

  messaging.onBackgroundMessage((payload) => {
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

    if (event.action === 'decline') {
      return;
    }

    const relativeLink = event.notification.data?.link || '/';
    const urlToOpen = new URL(relativeLink, self.location.origin).toString();
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url, self.location.origin).toString();
          if (clientUrl === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ('navigate' in client && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
}
