import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { CurrentUser } from "../../../utils/CurrentUser";
import { notifyProfileUpdated, getSavedRealTalents, saveRealTalents } from "./users";
import { doc, onSnapshot, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
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
    try {
        let targetId = uid;
        let snap = await rateLimitedGet(doc(db, COLLECTIONS.PROFILES, targetId));
        if (snap.exists()) {
            const data = snap.data() || {};
            if (data.linkedUid || data.canonicalUid) {
                targetId = data.linkedUid || data.canonicalUid;
                const canonicalSnap = await rateLimitedGet(doc(db, COLLECTIONS.PROFILES, targetId));
                if (canonicalSnap.exists()) {
                    snap = canonicalSnap;
                }
            }
        }
        
        if (snap.exists()) {
            const pData = snap.data() || {};
            const userSnap = await rateLimitedGet(doc(db, COLLECTIONS.USERS, targetId));
            const uData = userSnap.exists() ? (userSnap.data() || {}) : {};
            return { data: { uid: targetId, id: targetId, ...uData, ...pData } as ProfileData, error: null };
        }
        const userSnap = await rateLimitedGet(doc(db, COLLECTIONS.USERS, uid));
        if (userSnap.exists()) {
            const uData = userSnap.data() || {};
            const canonicalId = uData.linkedUid || uData.canonicalUid;
            if (canonicalId) {
                const canonicalSnap = await rateLimitedGet(doc(db, COLLECTIONS.PROFILES, canonicalId));
                if (canonicalSnap.exists()) {
                    return { data: { uid: canonicalId, id: canonicalId, ...uData, ...canonicalSnap.data() } as ProfileData, error: null };
                }
            }
            return { data: { uid, id: uid, ...uData } as ProfileData, error: null };
        }
        return { data: null, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch profile";
        console.error("Error fetching profile:", message);
        return { data: null, error: message };
    }
};
export const updateProfileData = async (uid: string, data: ProfileData): Promise<{
    success: boolean;
    error: string | null;
}> => {
    try {
        const currentUserUid = AuthService.getUserId() || CurrentUser.id;
        if (!currentUserUid || (currentUserUid !== uid && !uid.includes(currentUserUid))) {
            return { success: false, error: "Unauthorized profile update" };
        }
        const cleanData = Object.entries(data).reduce((acc, [k, v]) => {
            if (v !== undefined)
                acc[k] = v;
            return acc;
        }, {} as ProfileData);
        const {
            email, phone, password, passwordHash, passwordReset, fcmToken, fcmTokens,
            verified, isAdmin, status,
            ...profileDataOnly
        } = cleanData as any;
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userUpdate: Record<string, any> = { 
            uid,
            id: uid,
            updatedAt: serverTimestamp() 
        };
        if (cleanData.email !== undefined) userUpdate.email = cleanData.email;
        if (cleanData.createdAt !== undefined) userUpdate.createdAt = cleanData.createdAt;
        if (cleanData.name !== undefined) {
            userUpdate.name = cleanData.name;
            userUpdate.displayName = cleanData.displayName || cleanData.name;
            CurrentUser.setName(cleanData.name as string);
        }
        if (cleanData.role !== undefined) {
            userUpdate.role = cleanData.role;
            CurrentUser.setProfileInfo(cleanData.role as string);
        }
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
        const nameToUse = cleanData.name || CurrentUser.fullName || AuthService.getFullName();
        if (nameToUse && !profileDataOnly.name) {
            profileDataOnly.name = nameToUse;
        }
        if (!profileDataOnly.displayName && nameToUse) {
            profileDataOnly.displayName = nameToUse;
        }
        profileDataOnly.uid = uid;
        profileDataOnly.id = uid;
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

        const newImage = (cleanData.image !== undefined ? cleanData.image : (cleanData.photoURL !== undefined ? cleanData.photoURL : cleanData.profileImage)) as string | null | undefined;
        const finalImgUrl = (newImage && typeof newImage === 'string') ? newImage : "";
        if (finalImgUrl) {
            CurrentUser.setImageUrl(finalImgUrl);
        }
        notifyProfileUpdated(uid, finalImgUrl, cleanData);
        cacheManager.invalidateCache(`profile_${uid}`);
        cacheManager.invalidateCache(`profile_sub_${uid}`);
        cacheManager.invalidateCache(`talents_list_all`);
        cacheManager.invalidateCache(`user_doc_${uid}`);
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
                const data = snap.data() || {};
                const targetId = data.linkedUid || data.canonicalUid;
                if (targetId && targetId !== uid) {
                    rateLimitedGet(doc(db, COLLECTIONS.PROFILES, targetId)).then((canSnap) => {
                        if (canSnap.exists()) {
                            pooledCb({ uid: targetId, id: targetId, ...canSnap.data(), ...data } as ProfileData, null);
                        } else {
                            pooledCb({ uid, ...data } as ProfileData, null);
                        }
                    }).catch(() => {
                        pooledCb({ uid, ...data } as ProfileData, null);
                    });
                } else {
                    pooledCb({ uid, ...data } as ProfileData, null);
                }
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
        const targetUid = uid || AuthService.getUserId() || CurrentUser.id;
        if (!targetUid) {
            console.error("Unauthorized media upload attempt");
            return null;
        }
        const defaultPath = `media/${targetUid}/${Date.now()}_${file.name}`;
        const targetPath = customPath
            ? customPath
            : defaultPath;
        const url = await uploadFile(file, targetPath, onProgress, targetUid);
        return url;
    }
    catch (error) {
        console.error("Client-side storage upload failed:", error);
        return null;
    }
};

export const deleteAccount = async (uid: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        const currentUserUid = AuthService.getUserId() || CurrentUser.id;
        if (!currentUserUid || (currentUserUid !== uid && !uid.includes(currentUserUid))) {
            return { success: false, error: "Unauthorized: You can only delete your own account." };
        }

        const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const contactRef = doc(db, "contact_info", uid);

        await Promise.allSettled([
            deleteDoc(profileRef),
            deleteDoc(userRef),
            deleteDoc(contactRef)
        ]);

        const saved = getSavedRealTalents();
        const updated = saved.filter((t: any) => (t.uid || t.id) !== uid);
        saveRealTalents(updated);
        cacheManager.reemit("talents_list_all", updated);
        cacheManager.invalidateCache(`profile_${uid}`);
        cacheManager.invalidateCache(`profile_sub_${uid}`);
        cacheManager.invalidateCache(`user_doc_${uid}`);
        cacheManager.invalidateCache("talents_list_all");

        CurrentUser.setName(null);
        CurrentUser.setImageUrl(null);
        CurrentUser.setProfileInfo('user');

        return { success: true, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete account";
        console.error("Account deletion error:", message);
        return { success: false, error: message };
    }
};

