import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { collection, doc, query, orderBy, where, onSnapshot, setDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { rateLimitedGet } from "../../../utils/rateLimitedFirestore";
import apiClient from "../../../api/client";
import { COLLECTIONS } from "../../../constants/collections";
import { cacheManager } from "../../../utils/cacheManager";
export const subscribeToCastingCalls = (filter?: string | ((data: any, error?: any) => void), callback?: (data: any, error?: any) => void) => {
    let actualFilter: string = "all";
    let actualCallback: ((data: any, error?: any) => void) | undefined = callback;
    if (typeof filter === "function") {
        actualCallback = filter;
        actualFilter = "all";
    }
    else if (typeof filter === "string") {
        actualFilter = filter;
    }
    const poolKey = `casting_calls_${actualFilter.toLowerCase()}`;
    return cacheManager.subscribePooled(poolKey, (pooledCb) => {
        let q;
        if (actualFilter && typeof actualFilter === "string" && actualFilter.toLowerCase() !== "all") {
            q = query(collection(db, COLLECTIONS.CASTING_CALLS), where("type", "==", actualFilter), orderBy("createdAt", "desc"));
        }
        else {
            q = query(collection(db, COLLECTIONS.CASTING_CALLS), orderBy("createdAt", "desc"));
        }
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        const usersRef = collection(db, COLLECTIONS.USERS);
        const snap = await getDocs(usersRef);

        const targetType = (callData.type || "").toLowerCase();
        const targetLocation = (callData.location || "").toLowerCase();

        const notificationPromises: Promise<any>[] = [];

        snap.forEach((userDoc) => {
            if (userDoc.id === creatorId) return;

            const u = userDoc.data();
            const userCategory = (u.category || u.role || u.talentType || "").toLowerCase();
            const userLocation = (u.location || u.address || u.city || "").toLowerCase();

            // Match if user's category matches the target talent type OR if user's location matches
            const matchesCategory = Boolean(targetType && (userCategory.includes(targetType) || targetType.includes(userCategory)));
            const matchesLocation = Boolean(targetLocation && (userLocation.includes(targetLocation) || targetLocation.includes(userLocation)));

            if (matchesCategory || matchesLocation || !targetType) {
                notificationPromises.push(
                    addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
                        recipientId: userDoc.id,
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
            }
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
        const currentUserUid = AuthService.getUserId();
        if (!currentUserUid) {
            return { id: null, error: "Authentication required" };
        }
        const response = await apiClient.post<{
            id: string;
        }>("/casting", callData, { timeout: 2000 });
        const createdId = response.data?.id || callData.id;
        if (createdId) {
            dispatchTargetedAuditionAlerts(createdId, callData);
        }
        return { id: createdId || null, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to create casting call";
        console.warn("Backend createCastingCall failed, attempting client-side fallback write:", message);
        try {
            const currentUserUid = AuthService.getUserId();
            if (!currentUserUid) {
                return { id: null, error: "Authentication required" };
            }
            const { id, ...dataToSave } = callData;
            const finalId = id || doc(collection(db, COLLECTIONS.CASTING_CALLS)).id;
            await setDoc(doc(db, COLLECTIONS.CASTING_CALLS, finalId), {
                ...dataToSave,
                createdAt: serverTimestamp(),
                createdBy: currentUserUid,
                status: dataToSave.status || "Open",
            });
            dispatchTargetedAuditionAlerts(finalId, callData);
            return { id: finalId, error: null };
        }
        catch (clientError: any) {
            console.error("Client fallback createCastingCall error:", clientError.message);
            return { id: null, error: clientError.message || "Failed to create casting call on client" };
        }
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
