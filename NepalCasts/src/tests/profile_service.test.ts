import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfileData } from '../features/profile/services/profile';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';
import { setDoc } from 'firebase/firestore';

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('../services/storage', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('../features/profile/services/users', () => ({
  notifyProfileUpdated: vi.fn(),
  getSavedRealTalents: vi.fn(() => []),
  saveRealTalents: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}`, id })),
  setDoc: vi.fn().mockResolvedValue({}),
  serverTimestamp: vi.fn(() => ({ toMillis: () => 12345678 })),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue({}),
}));

describe('Profile Security - Update & Privilege Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.setSession({
      id: null,
      email: null,
      fullName: null,
      username: null,
      imageUrl: null,
      getToken: async () => null,
    });
    CurrentUser.setProfileInfo('user');
  });

  it('rejects profile update when unauthenticated', async () => {
    const result = await updateProfileData('target_user_1', {
      name: 'Unauthenticated User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized profile update');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('rejects cross-user profile update attempts', async () => {
    AuthService.setSession({
      id: 'attacker_uid_999',
      email: 'attacker@nepalcasts.com',
      fullName: 'Attacker',
      username: 'attacker',
      imageUrl: null,
      getToken: async () => 'mock-token',
    });

    // Attempt to update victim user's profile
    const result = await updateProfileData('victim_uid_111', {
      bio: 'Defaced profile bio',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized profile update');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('strips privilege escalation fields (isAdmin, verified, status) from update payload', async () => {
    AuthService.setSession({
      id: 'actor_uid_456',
      email: 'actor@nepalcasts.com',
      fullName: 'Talent User',
      username: 'talentuser',
      imageUrl: null,
      getToken: async () => 'mock-token',
    });

    const maliciousUpdatePayload = {
      name: 'Talent User Updated',
      bio: 'Professional theater actor',
      location: 'Kathmandu',
      // Privileged fields that user should not be able to self-assign:
      isAdmin: true,
      verified: true,
      status: 'superadmin',
      passwordHash: 'injected_hash',
      fcmTokens: ['spoofed_token'],
    };

    const result = await updateProfileData('actor_uid_456', maliciousUpdatePayload);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    // Verify user doc update was called
    expect(setDoc).toHaveBeenCalled();

    // Inspect all setDoc calls to verify privilege fields were never passed to Firestore
    const setDocCalls = vi.mocked(setDoc).mock.calls;
    for (const [_ref, data] of setDocCalls) {
      expect(data).not.toHaveProperty('isAdmin');
      expect(data).not.toHaveProperty('verified');
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('passwordHash');
      expect(data).not.toHaveProperty('fcmTokens');
    }
  });
});
