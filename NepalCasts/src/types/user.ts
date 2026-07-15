/**
 * @module types/user
 * @description Domain types for user accounts and public profiles.
 *
 * Maps to Firestore collections:
 *   - `users/{userId}`     → UserRecord
 *   - `profiles/{userId}`  → UserProfile
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Enums & Unions
// ---------------------------------------------------------------------------

/** Talent categories that appear across casting, profiles, and filters. */
export type TalentRole =
  | 'Actors'
  | 'Directors'
  | 'Models'
  | 'Dancers'
  | 'Musicians'
  | 'Voice Over'
  | 'VFX'
  | 'Writers';

/** Gender values used during onboarding and profile display. */
export type Gender = 'Male' | 'Female' | 'Other' | '';

// ---------------------------------------------------------------------------
// Skill / Experience
// ---------------------------------------------------------------------------

export interface Skill {
  name: string;
  level?: number; // 0–100
  [key: string]: unknown;
}

export interface Experience {
  title?: string;
  role?: string;
  year?: string;
  description?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// UserProfile — public-facing profile stored in `profiles/{uid}`
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  email?: string;
  role: TalentRole | string;
  category?: string;
  gender?: Gender | string;
  bio?: string;
  location?: string;

  // Physical attributes
  height?: string | null;
  weight?: string | null;
  eyeColor?: string;
  hairColor?: string;

  // Media
  image?: string | null;
  photoURL?: string | null;
  coverImage?: string | null;
  introVideo?: string | null;
  media?: string[];

  // Professional
  languages?: string[];
  skills?: (string | Skill)[];
  experience?: Experience[];
  openToWork?: boolean;
  openToAudition?: boolean;
  showContactInfo?: boolean;

  // Status
  verified?: boolean;
  online?: boolean;
  deactivated?: boolean;
  lastSeen?: Timestamp | null;

  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  rating?: number;
  reviewsCount?: number;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// UserRecord — private user data stored in `users/{uid}`
// ---------------------------------------------------------------------------

export interface UserRecord {
  uid: string;
  name: string;
  email?: string;
  role?: TalentRole | string;
  gender?: Gender | string;
  category?: string;
  isAdmin?: boolean;
  blockedUsers?: string[];
  deletionScheduled?: boolean;
  deletionGracePeriodEndsAt?: Timestamp | null;
  status?: 'active' | 'banned';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Session & Login History (subcollections of `profiles/{uid}`)
// ---------------------------------------------------------------------------

export interface UserSession {
  id?: string;
  os?: string;
  browser?: string;
  location?: string;
  userAgent?: string;
  lastActive?: Timestamp;
  createdAt?: Timestamp;
}

export interface LoginHistoryEntry {
  id?: string;
  timestamp?: Timestamp;
  source?: string;
  ip?: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Bootstrap payload (sent during onboarding)
// ---------------------------------------------------------------------------

export interface BootstrapUserPayload {
  name: string;
  role?: string;
  gender?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Profile update payload (partial profile mutations)
// ---------------------------------------------------------------------------

export type ProfileUpdatePayload = Partial<
  Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'verified'>
>;
