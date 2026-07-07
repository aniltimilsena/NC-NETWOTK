/**
 * @module types/notification
 * @description Domain types for in-app and push notifications.
 *
 * Maps to Firestore collection:
 *   - `notifications/{notifId}` → AppNotification
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'message'
  | 'follow'
  | 'casting_match'
  | 'review'
  | 'call_missed'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  targetUrl?: string;
  createdAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Push Notification (OneSignal payload shape)
// ---------------------------------------------------------------------------

export interface PushNotificationPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// FCM Token registration
// ---------------------------------------------------------------------------

export interface NotificationTokenPayload {
  token: string;
}
