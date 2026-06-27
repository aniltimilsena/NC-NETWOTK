import { useEffect, useCallback } from 'react';
import { messaging } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { playNotificationSound } from '../utils/notification-sound';
import { callSecureFunction } from '../api/functionsClient';
import { formatMessagePreview } from '../utils/format';
import apiClient from '../api/client';

// VAPID key is required for FCM Web
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

const resolveLinkToPath = (link?: string): string => {
  if (!link) return '/';
  if (link.startsWith('/') || link.startsWith('http')) return link;
  
  // Parse format "pageName" or "pageName:paramValue"
  let page = link;
  let param: any = null;
  if (link.includes(':')) {
    [page, param] = link.split(':');
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
    default: return `/${page}`;
  }
};

interface NotificationPayload {
  message: string;
  type?: 'success' | 'error' | 'info' | 'logout';
  detail?: string;
  link?: string;
}

export const useNotifications = (
  user: any, 
  showAlert: (msg: string, type?: any, detail?: string, onAction?: () => void) => void,
  onNavigate: (page: string, param?: any) => void
) => {
  
  const parseLink = (link?: string): { page: string, param?: any } | null => {
    if (!link) return null;
    
    // Support formats: "pageName" or "pageName:paramValue"
    if (link.includes(':')) {
      const [page, param] = link.split(':');
      return { page, param };
    }
    
    return { page: link };
  };

  const registerFCMToken = useCallback(async () => {
    if (!messaging || !user?.uid) return;

    if (!VAPID_KEY) {
      console.warn('Skipping FCM registration: VITE_FCM_VAPID_KEY is not defined.');
      return;
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Skipping FCM registration: Service Workers are not supported in this browser.');
      return;
    }

    // Skip on localhost in local development ONLY if explicitly disabled
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const disableFCMOnLocalhost = import.meta.env.VITE_DISABLE_FCM_LOCALHOST === 'true';
    
    if (isLocalhost && disableFCMOnLocalhost) {
      console.log('Skipping FCM registration on localhost (VITE_DISABLE_FCM_LOCALHOST is true)');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const config = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
          databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app/`,
        };
        const configStr = encodeURIComponent(JSON.stringify(config));
        
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?config=${configStr}`
        );

        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration 
        });

        if (token) {
          // Try registering with the local Express backend first
          let registeredLocally = false;
          try {
            const response = await apiClient.post('/notifications/register-token', { token }, { timeout: 2000 });
            if (response.data?.success) {
              console.log('FCM Token successfully saved to local Express database');
              registeredLocally = true;
            }
          } catch (backendError) {
            console.warn('Local Express backend FCM registration failed, attempting Cloud Function fallback:', backendError);
          }

          if (!registeredLocally) {
            // Fallback to Firebase Cloud Function
            const { data, error: registerError } = await callSecureFunction<{ token: string }, { success: boolean }>(
              'registerNotificationToken', 
              { token }
            );
            if (registerError) {
              console.error('Failed to register FCM Token on backend database:', registerError);
            } else if (data?.success) {
              console.log('FCM Token successfully saved to database via Cloud Function');
            } else {
              console.log('FCM Token registration returned without explicit success flag');
            }
          }
        } else {
          console.warn('FCM token generation succeeded but returned empty token');
        }
      } else {
        console.warn('FCM registration skipped: Notification permission denied or not granted');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('FCM subscription failed:', error);
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      registerFCMToken();
    }
  }, [user?.uid, registerFCMToken]);

  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      const { title, body, icon } = payload.notification || {};
      const { link } = payload.data || {};
      
      const navigation = parseLink(link);
      playNotificationSound();

      if (document.visibilityState === 'visible') {
        showAlert(
          title || 'New Notification',
          'info',
          formatMessagePreview(body),
          navigation ? () => onNavigate(navigation.page, navigation.param) : undefined
        );
      } else {
        // Tab is open but hidden (backgrounded). Because FCM onMessage intercepted it, 
        // the service worker's background handler won't run. We must trigger a native system notification.
        if (Notification.permission === 'granted') {
          const notificationTitle = title || 'New Notification';
          const resolvedLink = resolveLinkToPath(link);
          const notificationOptions = {
            body: formatMessagePreview(body),
            icon: icon || '/logo.png',
            data: { link: resolvedLink }
          };

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(notificationTitle, notificationOptions);
            }).catch(() => {
              new Notification(notificationTitle, notificationOptions);
            });
          } else {
            new Notification(notificationTitle, notificationOptions);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [showAlert, onNavigate]);

  return { registerFCMToken };
};
