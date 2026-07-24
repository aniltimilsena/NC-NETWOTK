/**
 * @module types/conversation
 * @description Domain types for conversations (DMs) and messages.
 *
 * Maps to Firestore collections:
 *   - `conversations/{convoId}`                   → Conversation
 *   - `conversations/{convoId}/messages/{msgId}`   → Message
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

export type MessageType = 'text' | 'image' | 'video' | 'file';

export interface MessageReplyTo {
  id: string;
  text: string;
  senderId: string;
}

/** Reactions stored as a map: emoji → array of user UIDs who reacted. */
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

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Enriched conversation used in the Messages page UI
// (includes resolved participant profile data)
// ---------------------------------------------------------------------------

export interface ConversationListItem extends Conversation {
  /** Display name of the other participant. */
  name?: string;
  /** Avatar URL of the other participant. */
  avatar?: string;
  /** UID of the other participant. */
  otherUserId?: string;
  /** Whether the other user is currently online. */
  online?: boolean;
}

// ---------------------------------------------------------------------------
// Payloads for Cloud Function / API calls
// ---------------------------------------------------------------------------

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
