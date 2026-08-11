import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { doc, onSnapshot, setDoc, serverTimestamp, } from "firebase/firestore";
import { rateLimitedGet } from "../../../utils/rateLimitedFirestore";
import { uploadFile } from "../../../services/storage";
import { COLLECTIONS } from "../../../constants/collections";
export type ProfileData = {
    [key: string]: unknown;
};
type ProfileResponse = {
    data: ProfileData | null;
    error: string | null;
};
import { cacheManager } from "../../../utils/cacheManager";
export const getProfile = async (uid: string): Promise<ProfileResponse> => {
    return cacheManager.fetchWithCache(`profile_${uid}`, async () => {
        try {
            const snap = await rateLimitedGet(doc(db, COLLECTIONS.PROFILES, uid));
            if (snap.exists()) {
                return { data: { uid, ...snap.data() } as ProfileData, error: null };
            }
            return { data: null, error: null };
        }
        catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to fetch profile";
            console.error("Error fetching profile:", message);
            return { data: null, error: message };
        }
    }, 10 * 60 * 1000);
};
export const updateProfileData = async (uid: string, data: ProfileData): Promise<{
    success: boolean;
    error: string | null;
}> => {
    try {
        const currentUserUid = AuthService.getUserId();
        if (!currentUserUid || currentUserUid !== uid) {
            return { success: false, error: "Unauthorized profile update" };
        }
        const cleanData = Object.entries(data).reduce((acc, [k, v]) => {
            if (v !== undefined)
                acc[k] = v;
            return acc;
        }, {} as ProfileData);
        const { 
            email, phone, password, passwordHash, passwordReset, fcmToken, fcmTokens,
            verified, isPremium, premium, isPro, isAdmin, status,
            ...profileDataOnly 
        } = cleanData as any;
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userUpdate: Record<string, any> = { updatedAt: serverTimestamp() };
        if (cleanData.name !== undefined)
            userUpdate.name = cleanData.name;
        if (cleanData.role !== undefined)
            userUpdate.role = cleanData.role;
        if (cleanData.gender !== undefined)
            userUpdate.gender = cleanData.gender;
        if (cleanData.category !== undefined)
            userUpdate.category = cleanData.category;
        if (cleanData.openToAudition !== undefined)
            userUpdate.openToAudition = cleanData.openToAudition;
        if (cleanData.openToWork !== undefined)
            userUpdate.openToWork = cleanData.openToWork;
        if (cleanData.image !== undefined)
            userUpdate.image = cleanData.image;
        if (cleanData.coverImage !== undefined)
            userUpdate.coverImage = cleanData.coverImage;
        if (cleanData.photoURL !== undefined)
            userUpdate.photoURL = cleanData.photoURL;
        if (cleanData.bio !== undefined)
            userUpdate.bio = cleanData.bio;
        if (cleanData.location !== undefined)
            userUpdate.location = cleanData.location;
        if (cleanData.skills !== undefined)
            userUpdate.skills = cleanData.skills;
        if (cleanData.experience !== undefined)
            userUpdate.experience = cleanData.experience;
        try {
            await setDoc(userRef, userUpdate, { merge: true });
        }
        catch (uErr) {
            console.warn("User collection pre-sync warning:", uErr);
        }
        const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
        await setDoc(profileRef, {
            ...profileDataOnly,
            updatedAt: serverTimestamp()
        }, { merge: true });
        if (email !== undefined || phone !== undefined) {
            try {
                const contactRef = doc(db, "contact_info", uid);
                const contactUpdate: Record<string, any> = {};
                if (email !== undefined)
                    contactUpdate.email = email;
                if (phone !== undefined)
                    contactUpdate.phone = phone;
                await setDoc(contactRef, contactUpdate, { merge: true });
            }
            catch (cErr) {
                console.warn("contact_info sync warning:", cErr);
            }
        }
        cacheManager.invalidateCache(`profile_${uid}`);
        return { success: true, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update profile";
        console.error("Profile update error:", message);
        return { success: false, error: message };
    }
};
export const subscribeToProfile = (uid: string, callback: (data: ProfileData | null) => void) => {
    return cacheManager.subscribePooled(`profile_sub_${uid}`, (pooledCb) => {
        let unsubUser: (() => void) | null = null;
        const unsubProfile = onSnapshot(doc(db, COLLECTIONS.PROFILES, uid), (snap) => {
            if (snap.exists()) {
                if (unsubUser) {
                    unsubUser();
                    unsubUser = null;
                }
                pooledCb({ uid, ...snap.data() } as ProfileData, null);
            }
            else {
                if (!unsubUser) {
                    unsubUser = onSnapshot(doc(db, COLLECTIONS.USERS, uid), (userSnap) => {
                        if (userSnap.exists()) {
                            pooledCb({ uid, ...userSnap.data() } as ProfileData, null);
                        } else {
                            pooledCb(null, null);
                        }
                    }, (uErr) => {
                        pooledCb(null, uErr);
                    });
                }
            }
        }, (error) => {
            console.error("Profile subscription error:", error);
            pooledCb(null, error);
        });
        return () => {
            unsubProfile();
            if (unsubUser) unsubUser();
        };
    }, (data) => callback(data));
};
export const uploadProfileMedia = async (uid: string, file: File, onProgress?: (progress: number) => void, customPath?: string): Promise<string | null> => {
    try {
        const targetUid = AuthService.getUserId() || uid;
        if (!targetUid) {
            console.error("Unauthorized media upload attempt");
            return null;
        }
        const defaultPath = `media/${targetUid}/${Date.now()}_${file.name}`;
        const targetPath = customPath
            ? customPath.replace(uid, targetUid)
            : defaultPath;
        const url = await uploadFile(file, targetPath, onProgress, targetUid);
        return url;
    }
    catch (error) {
        console.error("Client-side storage upload failed:", error);
        return null;
    }
};
