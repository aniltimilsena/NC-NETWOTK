/**
 * @module types
 * @description Barrel re-export of all domain types.
 *
 * Usage:
 *   import type { UserProfile, Message, CastingCall } from '@/types';
 */

export type * from '../features/profile/types/user';
export type * from '../features/messages/types/conversation';
export type * from '../features/casting/types/casting';
export type * from '../features/notifications/types/notification';
export type * from '../features/call/types/call';
export type * from './api';
