import { AuthService } from '../services/AuthService';

export class CurrentUser {
    private static userRole: string = 'user';
    private static isPremiumUser: boolean = false;

    static setProfileInfo(role: string, premium: boolean) {
        this.userRole = role;
        this.isPremiumUser = premium;
    }

    static get id(): string | null {
        return AuthService.getUserId();
    }

    static get email(): string | null {
        return AuthService.getEmail();
    }

    static get fullName(): string | null {
        return AuthService.getFullName();
    }

    static get username(): string | null {
        return AuthService.getUsername();
    }

    static get imageUrl(): string | null {
        return AuthService.getImageUrl();
    }

    static get role(): string {
        return this.userRole;
    }

    static get premium(): boolean {
        return this.isPremiumUser;
    }
}
