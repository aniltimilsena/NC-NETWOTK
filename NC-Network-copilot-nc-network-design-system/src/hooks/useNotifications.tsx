import { useEffect, useCallback } from 'react';
import { messaging } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { playNotificationSound } from '../utils/notification-sound';
import { callSecureFunction } from '../api/functionsClient';
import { formatMessagePreview } from '../utils/format';

// VAPID key is required for FCM Web
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

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

    const localApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    
    // Skip on localhost in local development unless explicitly enabled via environment variable
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const enableFCMOnLocalhost = import.meta.env.VITE_ENABLE_FCM_LOCALHOST === 'true';
    
    if (isLocalhost && !enableFCMOnLocalhost) {
      console.log('Skipping FCM registration on localhost (set VITE_ENABLE_FCM_LOCALHOST=true to enable)');
      return;
    }

    if (localStorage.getItem('nc_fcm_unauthorized_key') === localApiKey) {
      console.log('Skipping FCM registration: FCM is unconfigured or unauthorized for this API key.');
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
          await callSecureFunction<{ token: string }, { success: boolean }>('registerNotificationToken', { token });
          console.log('FCM Token registered');
        }
      }
    } catch (error: any) {
      console.debug('FCM subscription skipped or failed (this is expected in local development):', error);
      const isUnauthorized = error && (
        error.code === 'messaging/token-subscribe-failed' || 
        String(error).includes('authentication credential') || 
        String(error).includes('401')
      );
      if (isUnauthorized) {
        localStorage.setItem('nc_fcm_unauthorized_key', import.meta.env.VITE_FIREBASE_API_KEY || 'dummy');
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
      
      if (document.visibilityState === 'visible') {
        const { title, body } = payload.notification || {};
        const { link } = payload.data || {};
        
        const navigation = parseLink(link);

        playNotificationSound();

        showAlert(
          title || 'New Notification',
          'info',
          formatMessagePreview(body),
          navigation ? () => onNavigate(navigation.page, navigation.param) : undefined
        );
      }
    });

    return () => unsubscribe();
  }, [showAlert, onNavigate]);

  return { registerFCMToken };
};
