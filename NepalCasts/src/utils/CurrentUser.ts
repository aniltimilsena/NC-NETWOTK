import { AuthService } from '../services/AuthService';

export class CurrentUser {
    private static userRole: string = 'user';
    private static canonicalImageUrl: string | null = null;
    private static canonicalName: string | null = null;

    static setProfileInfo(role: string) {
        this.userRole = role;
    }

    /**
     * Sync the canonical Firestore profile image URL.
     * This overrides the stale Clerk imageUrl so all consumers
     * (messaging service, notifications, etc.) use the correct photo.
     */
    static setImageUrl(url: string | null) {
        this.canonicalImageUrl = url;
    }

    /**
     * Sync the canonical Firestore profile display name.
     */
    static setName(name: string | null) {
        this.canonicalName = name;
    }

    static get id(): string | null {
        return AuthService.getUserId();
    }

    static get email(): string | null {
        return AuthService.getEmail();
    }

    static get fullName(): string | null {
        return this.canonicalName ?? AuthService.getFullName();
    }

    static get username(): string | null {
        return AuthService.getUsername();
    }

    static get imageUrl(): string | null {
        // Prefer canonical Firestore image over stale Clerk imageUrl
        return this.canonicalImageUrl ?? AuthService.getImageUrl();
    }

    static get role(): string {
        return this.userRole;
    }

    static get isAdmin(): boolean {
        const r = (this.userRole || '').toLowerCase();
        return r === 'admin' || (this.email?.toLowerCase() === 'aniltimilsena53@gmail.com');
    }
}
