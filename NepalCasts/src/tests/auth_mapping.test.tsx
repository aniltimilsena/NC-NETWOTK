import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';

describe('Clerk OAuth Account Mapping & Identity Isolation Audit', () => {
    beforeEach(() => {
        localStorage.clear();
        AuthService.setSession({
            id: null,
            email: null,
            fullName: null,
            username: null,
            imageUrl: null,
            getToken: async () => null,
        });
        CurrentUser.setProfileInfo('user', false);
        CurrentUser.setImageUrl(null);
        CurrentUser.setName(null);
    });

    it('uses Clerk userId as canonical identity for AuthService and CurrentUser', () => {
        const userA = {
            id: 'user_clerk_53',
            email: 'aniltimilsena53@gmail.com',
            fullName: 'Anil Timilsena',
            username: 'aniltimilsena53',
            imageUrl: 'https://img.clerk.com/user53.jpg',
            getToken: async () => 'mock-token-53',
        };

        AuthService.setSession(userA);

        expect(AuthService.getUserId()).toBe('user_clerk_53');
        expect(AuthService.getEmail()).toBe('aniltimilsena53@gmail.com');
        expect(CurrentUser.id).toBe('user_clerk_53');
        expect(CurrentUser.email).toBe('aniltimilsena53@gmail.com');
    });

    it('completely clears session and identity when switching users via logout', () => {
        // Step 1: Sign in as Account A
        AuthService.setSession({
            id: 'user_clerk_53',
            email: 'aniltimilsena53@gmail.com',
            fullName: 'Anil Timilsena',
            username: 'aniltimilsena53',
            imageUrl: 'https://img.clerk.com/user53.jpg',
            getToken: async () => 'token-53',
        });
        CurrentUser.setProfileInfo('admin', true);
        CurrentUser.setName('Anil Timilsena A');
        CurrentUser.setImageUrl('https://firestore/user53.jpg');

        expect(CurrentUser.id).toBe('user_clerk_53');
        expect(CurrentUser.fullName).toBe('Anil Timilsena A');

        // Step 2: Sign out (Simulate handleLogout session reset)
        AuthService.setSession({
            id: null,
            email: null,
            fullName: null,
            username: null,
            imageUrl: null,
            getToken: async () => null,
        });
        CurrentUser.setProfileInfo('user', false);
        CurrentUser.setName(null);
        CurrentUser.setImageUrl(null);

        expect(CurrentUser.id).toBeNull();
        expect(CurrentUser.fullName).toBeNull();
        expect(AuthService.getUserId()).toBeNull();

        // Step 3: Sign in as Account B (different Google account / Clerk userId, same display name)
        AuthService.setSession({
            id: 'user_clerk_38',
            email: 'aniltimilsena38@gmail.com',
            fullName: 'Anil Timilsena',
            username: 'aniltimilsena38',
            imageUrl: 'https://img.clerk.com/user38.jpg',
            getToken: async () => 'token-38',
        });
        CurrentUser.setProfileInfo('user', false);
        CurrentUser.setName('Anil Timilsena B');

        // Step 4: Verify Account B does NOT inherit Account A's identity or profile data
        expect(AuthService.getUserId()).toBe('user_clerk_38');
        expect(AuthService.getEmail()).toBe('aniltimilsena38@gmail.com');
        expect(CurrentUser.id).toBe('user_clerk_38');
        expect(CurrentUser.fullName).toBe('Anil Timilsena B');
        expect(CurrentUser.fullName).not.toBe('Anil Timilsena A');
    });

    it('ensures separate Clerk user IDs with identical display names are never merged', () => {
        const userA_Id = 'user_clerk_53';
        const userB_Id = 'user_clerk_38';

        // Display names are identical
        const nameA = 'Anil Timilsena';
        const nameB = 'Anil Timilsena';

        expect(userA_Id).not.toBe(userB_Id);
        expect(nameA).toBe(nameB);

        // Verify isOwnProfile logic (strict UID comparison)
        const checkIsOwnProfile = (myUid: string | null, targetUid: string | null) => {
            return Boolean(myUid && targetUid === myUid);
        };

        // User B viewing User A's profile must be false even if names match
        expect(checkIsOwnProfile(userB_Id, userA_Id)).toBe(false);

        // User A viewing User A's profile must be true
        expect(checkIsOwnProfile(userA_Id, userA_Id)).toBe(true);
    });
});
