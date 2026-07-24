/**
 * @module types/casting
 * @description Domain types for casting calls and talent applications.
 *
 * Maps to Firestore collections:
 *   - `casting_calls/{callId}`   → CastingCall
 *   - `applications/{appId}`     → CastingApplication
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Casting Call
// ---------------------------------------------------------------------------

export type CastingType = 'Film' | 'Commercial' | 'Web Series' | 'Theatre';

export type CastingStatus = 'Open' | 'Closed';

export interface CastingRole {
  name?: string;
  description?: string;
  gender?: string;
  ageRange?: string;
  [key: string]: unknown;
}

export interface CastingCall {
  id: string;
  title: string;
  description?: string;
  type: CastingType | string;
  budget?: string;
  location: string;
  thumbnail?: string;
  requirements?: string[];
  deadline?: string;
  production?: string;
  roles?: CastingRole[];
  highPriority?: boolean;
  status: CastingStatus;

  // Creator info
  createdBy: string;
  creatorName?: string;
  creatorEmail?: string;

  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Casting Application
// ---------------------------------------------------------------------------

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface CastingApplication {
  id: string;
  userId: string;
  creatorId: string;
  castingId: string;
  status: ApplicationStatus;
  createdAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export type CreateCastingPayload = Omit<
  CastingCall,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'
> & {
  id?: string;
  status?: CastingStatus;
};

export type UpdateCastingPayload = Partial<
  Omit<CastingCall, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
> & {
  id: string;
};
