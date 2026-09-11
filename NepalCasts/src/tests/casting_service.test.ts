import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCastingCall, updateCastingCall } from '../features/casting/services/casting';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn().mockRejectedValue(new Error('Backend offline')),
    put: vi.fn().mockRejectedValue(new Error('Backend offline')),
  },
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({ id: 'mock_col' })),
    doc: vi.fn((_db, _col, id) => ({ id: id || 'generated_call_id' })),
    setDoc: vi.fn().mockResolvedValue({}),
    updateDoc: vi.fn().mockResolvedValue({}),
    serverTimestamp: vi.fn(() => ({ toMillis: () => 12345678 })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
    onSnapshot: vi.fn(),
  };
});

describe('Casting Call Service - Ownership & Creation Security', () => {
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

  describe('createCastingCall', () => {
    it('rejects casting call creation when unauthenticated', async () => {
      const result = await createCastingCall({
        title: 'Feature Film Lead Actor',
        type: 'Film',
        location: 'Kathmandu',
      });

      expect(result.id).toBeNull();
      expect(result.error).toBe('Authentication required');
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('forces creatorId and createdBy to match authenticated user UID', async () => {
      AuthService.setSession({
        id: 'producer_uid_101',
        email: 'producer@nepalcasts.com',
        fullName: 'Producer Anil',
        username: 'produceranil',
        imageUrl: null,
        getToken: async () => 'mock-token',
      });

      // Attempt to spoof creatorId to a different user
      const spoofedPayload = {
        id: 'call_123',
        title: 'Documentary Voiceover',
        type: 'Voiceover',
        location: 'Pokhara',
        creatorId: 'victim_producer_999',
        createdBy: 'victim_producer_999',
      };

      const result = await createCastingCall(spoofedPayload);

      expect(result.error).toBeNull();
      expect(result.id).toBe('call_123');

      // Verify setDoc was called with authenticated user's ID
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'call_123',
          creatorId: 'producer_uid_101',
          createdBy: 'producer_uid_101',
          title: 'Documentary Voiceover',
        })
      );
    });
  });

  describe('updateCastingCall', () => {
    it('rejects casting updates when caller is not the owner', async () => {
      AuthService.setSession({
        id: 'attacker_user_666',
        email: 'attacker@nepalcasts.com',
        fullName: 'Attacker',
        username: 'attacker',
        imageUrl: null,
        getToken: async () => 'mock-token',
      });

      // Attempt to update another producer's casting call
      const result = await updateCastingCall('legit_call_888', {
        title: 'Defaced Title',
        creatorId: 'legit_producer_777',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized: You can only edit your own casting calls');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('allows owner to update their own casting call', async () => {
      AuthService.setSession({
        id: 'legit_producer_777',
        email: 'producer@nepalcasts.com',
        fullName: 'Legit Producer',
        username: 'legitproducer',
        imageUrl: null,
        getToken: async () => 'mock-token',
      });

      const result = await updateCastingCall('legit_call_888', {
        title: 'Updated Audition Title',
        creatorId: 'legit_producer_777',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Updated Audition Title',
        })
      );
    });
  });
});
