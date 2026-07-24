/**
 * @module types/call
 * @description Domain types for WebRTC audio/video call signaling.
 *
 * Maps to Firestore collections:
 *   - `calls/{callId}`                          → CallDocument
 *   - `calls/{callId}/callerCandidates/{id}`     → ICE candidates
 *   - `calls/{callId}/calleeCandidates/{id}`     → ICE candidates
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Call Status
// ---------------------------------------------------------------------------

export type CallStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'ended'
  | 'no-answer'
  | 'busy';

export type CallType = 'audio' | 'video';

export type CallRole = 'caller' | 'callee';

// ---------------------------------------------------------------------------
// Call Document
// ---------------------------------------------------------------------------

export interface CallDocument {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  receiverId?: string;
  receiverName?: string;
  receiverAvatar?: string;
  callType: CallType;
  status: CallStatus;
  callStatus?: CallStatus;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number };
  endedAt?: Timestamp | { seconds: number; nanoseconds: number };
}

// ---------------------------------------------------------------------------
// Create Call Params
// ---------------------------------------------------------------------------

export interface CreateCallParams {
  callerId: string;
  callerName: string;
  callerPhoto: string;
  callerAvatar: string;
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  callType: CallType;
  offer: RTCSessionDescriptionInit;
}
