export class AuthService {
    private static currentUserId: string | null = null;
    private static currentUserEmail: string | null = null;
    private static currentUserFullName: string | null = null;
    private static currentUserUsername: string | null = null;
    private static currentImageUrl: string | null = null;
    private static tokenGetter: (() => Promise<string | null>) | null = null;

    static setSession(session: {
        id: string | null;
        email: string | null;
        fullName: string | null;
        username: string | null;
        imageUrl: string | null;
        getToken: () => Promise<string | null>;
    }) {
        this.currentUserId = session.id;
        this.currentUserEmail = session.email;
        this.currentUserFullName = session.fullName;
        this.currentUserUsername = session.username;
        this.currentImageUrl = session.imageUrl;
        this.tokenGetter = session.getToken;
    }

    static getUserId(): string | null {
        return this.currentUserId;
    }

    static getEmail(): string | null {
        return this.currentUserEmail;
    }

    static getFullName(): string | null {
        return this.currentUserFullName;
    }

    static getUsername(): string | null {
        return this.currentUserUsername;
    }

    static getImageUrl(): string | null {
        return this.currentImageUrl;
    }

    static async getIdToken(): Promise<string | null> {
        if (!this.tokenGetter) return null;
        return this.tokenGetter();
    }
    
    static isSignedIn(): boolean {
        return this.currentUserId !== null;
    }
}
