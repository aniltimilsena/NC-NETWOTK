import type { Timestamp } from 'firebase/firestore';
export type NotificationType = 'message' | 'follow' | 'casting_match' | 'review' | 'call_missed' | 'system';
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
export interface PushNotificationPayload {
    userIds: string[];
    title: string;
    body: string;
    url?: string;
}
export interface NotificationTokenPayload {
    token: string;
}
