import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleFollowUser } from '../features/profile/services/users';
import { updateProfileData } from '../features/profile/services/profile';
import { createCastingCall, updateCastingCall } from '../features/casting/services/casting';
import { sendMessage, updateMessage, deleteMessage } from '../features/messages/services/messaging';
import { AuthService } from '../services/AuthService';
import { setDoc, updateDoc } from 'firebase/firestore';

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn().mockRejectedValue(new Error('Backend offline')),
    get: vi.fn().mockRejectedValue(new Error('Backend offline')),
    put: vi.fn().mockRejectedValue(new Error('Backend offline')),
    delete: vi.fn().mockRejectedValue(new Error('Backend offline')),
  },
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...parts) => ({ id: parts[parts.length - 1] || 'col', path: parts.join('/') })),
    doc: vi.fn((_db, ...parts) => ({ id: parts[parts.length - 1] || 'doc', path: parts.join('/') })),
    setDoc: vi.fn().mockResolvedValue({}),
    updateDoc: vi.fn().mockResolvedValue({}),
    deleteDoc: vi.fn().mockResolvedValue({}),
    addDoc: vi.fn().mockResolvedValue({ id: 'generated_msg_id' }),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ participants: ['user_alice', 'user_bob'] }),
    }),
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toMillis: () => 12345678 })),
    increment: vi.fn((n) => n),
    onSnapshot: vi.fn(),
  };
});

describe('Authenticated Permissions & Cross-User Security Enforcement', () => {
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
  });

  describe('1. Connect / Follow Users Security', () => {
    it('rejects follow when unauthenticated', async () => {
      const result = await toggleFollowUser({
        currentUserId: '',
        targetUserId: 'target_user_123',
        isCurrentlyFollowing: false,
      });

      expect(result.success).toBe(false);
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('rejects attempts to impersonate another user as follower', async () => {
      AuthService.setSession({
        id: 'attacker_111',
        email: 'attacker@example.com',
        fullName: 'Attacker',
        username: 'attacker',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await toggleFollowUser({
        currentUserId: 'victim_222', // Trying to follow on behalf of victim
        targetUserId: 'target_333',
        isCurrentlyFollowing: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('never writes directly to target user profile document on client follow', async () => {
      AuthService.setSession({
        id: 'user_alice',
        email: 'alice@example.com',
        fullName: 'Alice',
        username: 'alice',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await toggleFollowUser({
        currentUserId: 'user_alice',
        targetUserId: 'user_bob',
        isCurrentlyFollowing: false,
      });

      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(true);

      // Verify setDoc was called ONLY on follows and notifications collections, NOT profiles/user_bob
      const setDocCalls = vi.mocked(setDoc).mock.calls;
      for (const [ref] of setDocCalls) {
        expect((ref as any).path).not.toBe('profiles/user_bob');
      }

      // Verify updateDoc was NOT called on target user's profile
      const updateDocCalls = vi.mocked(updateDoc).mock.calls;
      for (const [ref] of updateDocCalls) {
        expect((ref as any).path).not.toBe('profiles/user_bob');
      }
    });
  });

  describe('2. Profile Modification Security', () => {
    it('blocks modification of another user profile', async () => {
      AuthService.setSession({
        id: 'user_alice',
        email: 'alice@example.com',
        fullName: 'Alice',
        username: 'alice',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await updateProfileData('user_bob', {
        bio: 'Hacked bio',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized profile update');
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('allows user to update their own profile', async () => {
      AuthService.setSession({
        id: 'user_alice',
        email: 'alice@example.com',
        fullName: 'Alice',
        username: 'alice',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await updateProfileData('user_alice', {
        bio: 'Updated bio by Alice',
      });

      expect(result.success).toBe(true);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('3. Casting Calls Creation & Update Security', () => {
    it('forces creatorId to match authenticated Clerk user on creation', async () => {
      AuthService.setSession({
        id: 'producer_123',
        email: 'producer@example.com',
        fullName: 'Producer',
        username: 'producer',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await createCastingCall({
        id: 'call_999',
        title: 'Lead Actor',
        creatorId: 'spoofed_user_id', // Malicious attempt to spoof
      });

      expect(result.error).toBeNull();
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          creatorId: 'producer_123',
          createdBy: 'producer_123',
        })
      );
    });

    it('blocks updating a casting call owned by another user', async () => {
      AuthService.setSession({
        id: 'attacker_111',
        email: 'attacker@example.com',
        fullName: 'Attacker',
        username: 'attacker',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await updateCastingCall('call_999', {
        title: 'Defaced Casting Call',
        creatorId: 'victim_producer',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  describe('4. Messaging Security & Participant Enforcement', () => {
    it('rejects sending messages when unauthenticated', async () => {
      const result = await sendMessage('convo_123', '', 'Hello world');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('rejects sending messages impersonating another user', async () => {
      AuthService.setSession({
        id: 'user_alice',
        email: 'alice@example.com',
        fullName: 'Alice',
        username: 'alice',
        imageUrl: null,
        getToken: async () => 'token',
      });

      const result = await sendMessage('convo_123', 'user_bob', 'Spoofed message');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('rejects updating messages when unauthenticated', async () => {
      const result = await updateMessage('convo_123', 'msg_1', 'New text');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('rejects deleting messages when unauthenticated', async () => {
      const result = await deleteMessage('convo_123', 'msg_1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });
});
