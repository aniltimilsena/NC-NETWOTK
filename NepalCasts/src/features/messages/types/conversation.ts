import type { Timestamp } from 'firebase/firestore';
export type MessageType = 'text' | 'image' | 'video' | 'file';
export interface MessageReplyTo {
    id: string;
    text: string;
    senderId: string;
}
export type ReactionMap = Record<string, string[]>;
export interface Message {
    id: string;
    senderId: string;
    text: string;
    type: MessageType;
    isSystem?: boolean;
    isPinned?: boolean;
    reactions?: ReactionMap;
    replyTo?: MessageReplyTo | null;
    clientMsgId?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    hasPendingWrites?: boolean;
}
export interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt?: Timestamp;
    lastSenderId?: string;
    unread?: boolean;
    readBy?: Record<string, boolean>;
    unreadCounts?: Record<string, number>;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
export interface ConversationListItem extends Conversation {
    name?: string;
    avatar?: string;
    otherUserId?: string;
    online?: boolean;
}
export interface SendMessagePayload {
    conversationId: string;
    text: string;
    type?: MessageType;
    isSystem?: boolean;
    clientMsgId?: string;
    replyTo?: MessageReplyTo | null;
}
export interface UpdateMessagePayload {
    conversationId: string;
    messageId: string;
    text: string;
}
export interface DeleteMessagePayload {
    conversationId: string;
    messageId: string;
}
export interface MessageReactionPayload {
    conversationId: string;
    messageId: string;
    emoji: string;
}
export interface MessagePinPayload {
    conversationId: string;
    messageId: string;
    pinned: boolean;
}
