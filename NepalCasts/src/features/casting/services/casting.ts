import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { CurrentUser } from "../../../utils/CurrentUser";
import { collection, doc, query, orderBy, where, onSnapshot, setDoc, updateDoc, serverTimestamp, addDoc, getDocs, limit } from "firebase/firestore";
import { rateLimitedGet } from "../../../utils/rateLimitedFirestore";
import apiClient from "../../../api/client";
import { COLLECTIONS } from "../../../constants/collections";
import { cacheManager } from "../../../utils/cacheManager";
import { idbGet, idbSet, idbGetSync } from "../../../utils/idbStorage";

const saveCastingCallsCache = (filter: string, limitCount: number, data: any[]) => {
    const key = `nc_calls_cache_${filter.toLowerCase()}_${limitCount}`;
    idbSet(key, data.slice(0, 50));
};

const getCastingCallsCache = (filter: string, limitCount: number): any[] => {
    const key = `nc_calls_cache_${filter.toLowerCase()}_${limitCount}`;
    return idbGetSync<any[]>(key) || [];
};

export const subscribeToCastingCalls = (filter?: string | ((data: any, error?: any) => void), callback?: (data: any, error?: any) => void, limitCount: number = 20) => {
    let actualFilter: string = "all";
    let actualCallback: ((data: any, error?: any) => void) | undefined = callback;
    if (typeof filter === "function") {
        actualCallback = filter;
        actualFilter = "all";
    }
    else if (typeof filter === "string") {
        actualFilter = filter;
    }
    const poolKey = `casting_calls_${actualFilter.toLowerCase()}_limit_${limitCount}`;
    return cacheManager.subscribePooled(poolKey, (pooledCb) => {
        const cacheKey = `nc_calls_cache_${actualFilter.toLowerCase()}_${limitCount}`;
        const saved = getCastingCallsCache(actualFilter, limitCount);
        if (saved.length > 0) {
            pooledCb(saved, null);
        } else {
            idbGet<any[]>(cacheKey).then((asyncSaved) => {
                if (asyncSaved && asyncSaved.length > 0) {
                    pooledCb(asyncSaved, null);
                }
            });
        }

        let q;
        if (actualFilter && typeof actualFilter === "string" && actualFilter.toLowerCase() !== "all") {
            q = query(collection(db, COLLECTIONS.CASTING_CALLS), where("type", "==", actualFilter), orderBy("createdAt", "desc"), limit(limitCount));
        }
        else {
            q = query(collection(db, COLLECTIONS.CASTING_CALLS), orderBy("createdAt", "desc"), limit(limitCount));
        }
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            saveCastingCallsCache(actualFilter, limitCount, data);
            pooledCb(data, null);
        }, (error) => {
            console.error("Casting calls subscription error:", error);
            pooledCb([], error);
        });
    }, (data, error) => {
        if (actualCallback)
            actualCallback(data, error);
    });
};
export const getCastingCallById = async (id: string) => {
    return cacheManager.fetchWithCache(`casting_call_${id}`, async () => {
        try {
            const snap = await rateLimitedGet(doc(db, COLLECTIONS.CASTING_CALLS, id));
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        }
        catch (error) {
            console.error("Error fetching casting call:", error);
            return null;
        }
    }, 5 * 60 * 1000);
};
export const dispatchTargetedAuditionAlerts = async (callId: string, callData: any) => {
    try {
        const creatorId = AuthService.getUserId() || callData.creatorId;
        const targetType = callData.type;
        const targetLocation = callData.location;

        const queries = [];
        const roleNames: string[] = [];
        if (Array.isArray(callData.roles)) {
            callData.roles.forEach((r: any) => {
                const name = typeof r === 'string' ? r : r?.name;
                if (name && name.trim() && !roleNames.includes(name.trim())) {
                    roleNames.push(name.trim());
                }
            });
        }
        if (targetType && !roleNames.includes(targetType)) {
            roleNames.push(targetType);
        }

        roleNames.forEach((roleName) => {
            queries.push(query(collection(db, COLLECTIONS.USERS), where("role", "==", roleName)));
            queries.push(query(collection(db, COLLECTIONS.USERS), where("category", "==", roleName)));
        });

        if (targetLocation) {
            queries.push(query(collection(db, COLLECTIONS.USERS), where("location", "==", targetLocation)));
        }

        // Fallback limited fetch if target fields are empty to avoid scanning all users
        if (queries.length === 0) {
            queries.push(query(collection(db, COLLECTIONS.USERS), limit(20)));
        }

        const resolvedUsers = new Map<string, any>();
        await Promise.all(queries.map(async (q) => {
            try {
                const querySnap = await getDocs(q);
                querySnap.forEach((userDoc) => {
                    if (userDoc.id !== creatorId) {
                        resolvedUsers.set(userDoc.id, userDoc.data());
                    }
                });
            } catch (qErr) {
                console.warn("Targeted user query slice failed:", qErr);
            }
        }));

        const notificationPromises: Promise<any>[] = [];
        resolvedUsers.forEach((_u, userId) => {
            notificationPromises.push(
                addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
                    recipientId: userId,
                    senderId: creatorId,
                    title: `🎯 New Audition Alert: ${callData.title || "Casting Notice"}`,
                    message: `A new ${callData.type || "Casting"} audition matching your profile was posted in ${callData.location || "Nepal"}.`,
                    type: "casting",
                    notificationType: "casting",
                    link: `/casting/${callId}`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    priority: "high",
                })
            );
        });

        if (notificationPromises.length > 0) {
            await Promise.all(notificationPromises.slice(0, 50));
            console.log(`Successfully sent ${Math.min(notificationPromises.length, 50)} targeted audition alerts for casting ${callId}`);
        }
    }
    catch (err) {
        console.warn("Failed to dispatch targeted audition alerts:", err);
    }
};

export const createCastingCall = async (callData: any) => {
    try {
        const currentUserUid = AuthService.getUserId() || CurrentUser.id || callData.creatorId || callData.createdBy;
        if (!currentUserUid) {
            return { id: null, error: "Authentication required" };
        }

        const enrichedCallData = {
            ...callData,
            creatorId: currentUserUid,
            createdBy: currentUserUid,
        };

        let createdId: string | null = null;
        try {
            const response = await apiClient.post<{
                id: string;
            }>("/casting", enrichedCallData, { timeout: 3000 });
            createdId = response.data?.id || enrichedCallData.id;
        } catch (backendError) {
            console.warn("Backend /casting endpoint unavailable, writing to Firestore directly:", backendError);
        }

        if (!createdId) {
            const { id, ...dataToSave } = enrichedCallData;
            const finalId = id || doc(collection(db, COLLECTIONS.CASTING_CALLS)).id;
            await setDoc(doc(db, COLLECTIONS.CASTING_CALLS, finalId), {
                ...dataToSave,
                id: finalId,
                createdAt: serverTimestamp(),
                createdBy: currentUserUid,
                creatorId: currentUserUid,
                status: dataToSave.status || "active",
            });
            createdId = finalId;
        }

        if (createdId) {
            dispatchTargetedAuditionAlerts(createdId, callData).catch((err) => {
                console.warn("Background audition alerts dispatch failed:", err);
            });
        }
        return { id: createdId, error: null };
    }
    catch (clientError: any) {
        console.error("Client createCastingCall error:", clientError);
        return { id: null, error: clientError.message || "Failed to create casting call" };
    }
};

export const updateCastingCall = async (id: string, updateData: any) => {
    try {
        const currentUserUid = AuthService.getUserId() || CurrentUser.id || updateData.creatorId || updateData.createdBy;
        if (!currentUserUid) {
            return { success: false, error: "Authentication required" };
        }

        const enrichedUpdateData = {
            ...updateData,
            id,
            updatedAt: new Date().toISOString(),
        };

        let updated = false;
        try {
            const response = await apiClient.post<{ id: string }>("/casting", enrichedUpdateData, { timeout: 3000 });
            if (response.data?.id) {
                updated = true;
            }
        } catch (backendError) {
            console.warn("Backend /casting endpoint unavailable for update, writing to Firestore directly:", backendError);
        }

        if (!updated) {
            const { id: _, ...dataToSave } = enrichedUpdateData;
            await updateDoc(doc(db, COLLECTIONS.CASTING_CALLS, id), {
                ...dataToSave,
                updatedAt: serverTimestamp(),
            });
        }

        // Invalidate caches so UI sees changes immediately
        cacheManager.invalidateCache(`casting_call_${id}`);
        cacheManager.invalidateCache(`casting_calls_`);

        return { success: true, error: null };
    } catch (clientError: any) {
        console.error("Client updateCastingCall error:", clientError);
        return { success: false, error: clientError.message || "Failed to update casting call" };
    }
};
export const deleteCastingCallAdmin = async (id: string) => {
    try {
        await apiClient.delete(`/casting/${id}`);
        return { success: true, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to delete casting call";
        console.error("deleteCastingCallAdmin error:", message);
        return { success: false, error: message };
    }
};
export const setCastingPriorityAdmin = async (id: string, highPriority: boolean) => {
    try {
        await apiClient.put(`/casting/${id}/priority`, { highPriority });
        return { success: true, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to set casting priority";
        console.error("setCastingPriorityAdmin error:", message);
        return { success: false, error: message };
    }
};
