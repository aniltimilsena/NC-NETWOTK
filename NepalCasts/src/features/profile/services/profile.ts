import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { CurrentUser } from "../../../utils/CurrentUser";
import { notifyProfileUpdated, getSavedRealTalents, saveRealTalents } from "./users";
import { doc, onSnapshot, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { rateLimitedGet } from "../../../utils/rateLimitedFirestore";
import { COLLECTIONS } from "../../../constants/collections";
import apiClient from "../../../api/client";
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

        // Check local persistent cache of real talents
        const cleanParam = uid.replace(/^@/, '').toLowerCase().trim();
        const savedTalents = getSavedRealTalents();
        if (Array.isArray(savedTalents) && savedTalents.length > 0) {
            const found = savedTalents.find((t: any) => {
                const tUid = t.uid || t.id;
                const tUser = (t.username || '').toLowerCase().trim();
                return tUid === uid || (Boolean(cleanParam && tUser) && tUser === cleanParam);
            });
            if (found) {
                return { data: { uid: found.uid || found.id, id: found.id || found.uid, ...found } as ProfileData, error: null };
            }
        }

        // Check if uid matches a username in profiles or users
        if (cleanParam) {
            try {
                const { collection, query: fsQuery, where: fsWhere, getDocs: fsGetDocs } = await import('firebase/firestore');
                const qProfiles = fsQuery(collection(db, COLLECTIONS.PROFILES), fsWhere("username", "==", cleanParam));
                const snapProfiles = await fsGetDocs(qProfiles);
                if (!snapProfiles.empty) {
                    const docData = snapProfiles.docs[0].data();
                    const realUid = docData.linkedUid || docData.canonicalUid || docData.uid || snapProfiles.docs[0].id;
                    return { data: { uid: realUid, id: realUid, ...docData } as ProfileData, error: null };
                }
                const qUsers = fsQuery(collection(db, COLLECTIONS.USERS), fsWhere("username", "==", cleanParam));
                const snapUsers = await fsGetDocs(qUsers);
                if (!snapUsers.empty) {
                    const docData = snapUsers.docs[0].data();
                    const realUid = docData.uid || snapUsers.docs[0].id;
                    return { data: { uid: realUid, id: realUid, ...docData } as ProfileData, error: null };
                }
            } catch (_qErr) {}
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
            verified, isAdmin, status,
            ...profileDataOnly
        } = cleanData as any;

        // 1. Sync through backend API where Clerk token is verified and Admin SDK updates the documents
        try {
            await apiClient.post('/profile', cleanData, { timeout: 3500 });
        } catch (backendErr) {
            console.warn("Backend profile update warning, proceeding with client Firestore sync:", backendErr);
        }

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
export const uploadProfileMedia = async (uid: string, file: File, onProgress?: (progress: number) => void, customPath?: string): Promise<string> => {
    try {
        const targetUid = uid || AuthService.getUserId() || CurrentUser.id;
        if (!targetUid) {
            console.error("Unauthorized media upload attempt");
            throw new Error("Authentication required: Please sign in to upload media.");
        }
        const defaultPath = `media/${targetUid}/${Date.now()}_${file.name}`;
        const targetPath = customPath
            ? customPath
            : defaultPath;
        const url = await uploadFile(file, targetPath, onProgress, targetUid);
        return url;
    }
    catch (error: any) {
        console.error("Client-side storage upload failed:", error);
        throw error;
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

