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
    } catch (error) {
      console.debug('FCM subscription skipped or failed (this is expected in local development):', error);
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
