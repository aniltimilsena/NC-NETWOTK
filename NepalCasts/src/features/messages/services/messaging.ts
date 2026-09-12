import { db } from "../../../lib/firebase";
import { AuthService } from "../../../services/AuthService";
import { collection, doc, query, where, orderBy, onSnapshot, getDoc, getDocs, updateDoc, setDoc, addDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, runTransaction, } from "firebase/firestore";
import apiClient from "../../../api/client";
import { COLLECTIONS } from "../../../constants/collections";
import { getProfile } from "../../profile/services/profile";
import { isUserOnline } from "../../../utils/presence";
export const sendMessage = async (convoId: string, senderId: string, text: string, isSystem: boolean = false, replyTo?: any, type: "text" | "image" | "video" = "text", clientMsgId?: string) => {
    if (text && typeof text === 'string' && text.length > 2000) {
        return { success: false, error: "Message exceeds maximum length of 2000 characters" };
    }
    try {
        const response = await apiClient.post(`/messaging/${convoId}/messages`, {
            text,
            type,
            isSystem,
            clientMsgId,
            replyTo: replyTo
                ? {
                    id: replyTo.id,
                    text: replyTo.text,
                    senderId: replyTo.senderId,
                }
                : null,
        }, { timeout: 1500 });
        if (!response?.data || response.data.proxy === 'offline' || response.data.error) {
            throw new Error(response?.data?.message || "Backend proxy offline");
        }
        return { success: true, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend sendMessage failed, attempting client-side fallback write:", apiError);
        if (apiError.response?.status === 403 || apiError.response?.status === 401) {
            return { success: false, error: apiError.response.data?.error || "Action forbidden" };
        }
        const authUid = AuthService.getUserId();
        const currentUserUid = isSystem ? 'system' : (authUid || senderId);
        if (!currentUserUid) {
            return { success: false, error: "Authentication required" };
        }
        if (authUid && senderId && senderId !== 'system' && authUid !== senderId) {
            return { success: false, error: "Unauthorized: Cannot send message as another user" };
        }
        try {
            let targetConvoId = convoId;
            // If caller passed a raw user ID instead of a conversation ID, derive deterministic conversation ID
            if (targetConvoId && !targetConvoId.includes('_') && !targetConvoId.startsWith('app_') && targetConvoId !== currentUserUid) {
                const directSnap = await getDoc(doc(db, COLLECTIONS.CONVERSATIONS, targetConvoId));
                if (!directSnap.exists()) {
                    targetConvoId = [currentUserUid, targetConvoId].sort().join('_');
                }
            }
            const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, targetConvoId);
            const convoSnap = await getDoc(convoRef);
            let participants: string[] = [];
            if (convoSnap.exists()) {
                participants = convoSnap.data().participants || [];
                if (!isSystem && participants.length > 0 && !participants.includes(currentUserUid)) {
                    return { success: false, error: "Unauthorized: You are not a participant in this conversation" };
                }
            }
            if (participants.length === 0 && targetConvoId && !targetConvoId.startsWith('app_')) {
                if (targetConvoId.includes('_')) {
                    const parts = targetConvoId.split('_');
                    if (parts.length === 2 && parts.includes(currentUserUid)) {
                        participants = parts;
                    }
                }
            }
            const otherParticipantId = participants.find(p => p !== currentUserUid);
            if (otherParticipantId) {
                const [participantSnap, currentUserSnap] = await Promise.all([
                    getDoc(doc(db, COLLECTIONS.USERS, otherParticipantId)),
                    getDoc(doc(db, COLLECTIONS.USERS, currentUserUid))
                ]);
                if (participantSnap.exists()) {
                    const blockedUsers: string[] = participantSnap.data().blockedUsers || [];
                    if (blockedUsers.includes(currentUserUid)) {
                        return { success: false, error: "You cannot message this user" };
                    }
                }
                if (currentUserSnap.exists()) {
                    const userBlocked: string[] = currentUserSnap.data().blockedUsers || [];
                    if (userBlocked.includes(otherParticipantId)) {
                        return { success: false, error: "You have blocked this user" };
                    }
                }
            }
            await addDoc(collection(db, COLLECTIONS.CONVERSATIONS, targetConvoId, COLLECTIONS.MESSAGES), {
                senderId: isSystem ? "system" : currentUserUid,
                text,
                type,
                isSystem,
                clientMsgId: clientMsgId || null,
                replyTo: replyTo
                    ? {
                        id: replyTo.id,
                        text: replyTo.text,
                        senderId: replyTo.senderId,
                    }
                    : null,
                reactions: {},
                read: false,
                delivered: false,
                createdAt: serverTimestamp(),
            });
            const convoUpdate: Record<string, any> = {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                unread: true,
                lastSenderId: isSystem ? "system" : currentUserUid,
                lastMessageDelivered: false,
                lastMessageRead: false,
            };
            if (participants.length > 0) {
                const readBy: Record<string, boolean> = {};
                participants.forEach((pId: string) => {
                    readBy[pId] = pId === currentUserUid;
                });
                convoUpdate.readBy = readBy;
                const currentUnreadCounts = convoSnap.data()?.unreadCounts || {};
                const newUnreadCounts: Record<string, number> = {};
                participants.forEach((pId: string) => {
                    if (pId === currentUserUid) {
                        newUnreadCounts[pId] = 0;
                    }
                    else {
                        newUnreadCounts[pId] = (currentUnreadCounts[pId] || 0) + 1;
                    }
                });
                convoUpdate.unreadCounts = newUnreadCounts;
            }
            await setDoc(convoRef, {
                ...convoUpdate,
                ...(participants.length > 0 ? { participants } : {}),
            }, { merge: true });
            // Message notifications removed per user request
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("SendMessage fallback failed:", fallbackError);
            return { success: false, error: fallbackError.message || "Failed to send message" };
        }
    }
};
export const updateMessage = async (convoId: string, messageId: string, newText: string) => {
    const authUid = AuthService.getUserId();
    if (!authUid) {
        return { success: false, error: "Authentication required" };
    }
    if (newText && typeof newText === 'string' && newText.length > 2000) {
        return { success: false, error: "Message exceeds maximum length of 2000 characters" };
    }
    try {
        await apiClient.put(`/messaging/${convoId}/messages/${messageId}`, { text: newText }, { timeout: 1500 });
        return { success: true, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend updateMessage failed, attempting client-side fallback:", apiError);
        try {
            await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId), {
                text: newText,
                isEdited: true,
                updatedAt: serverTimestamp(),
            });
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("UpdateMessage fallback failed:", fallbackError);
            return { success: false, error: fallbackError.message || "Failed to update message" };
        }
    }
};
export const deleteMessage = async (convoId: string, messageId: string) => {
    const authUid = AuthService.getUserId();
    if (!authUid) {
        return { success: false, error: "Authentication required" };
    }
    try {
        await apiClient.delete(`/messaging/${convoId}/messages/${messageId}`, { timeout: 1500 });
        return { success: true, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend deleteMessage failed, attempting client-side fallback:", apiError);
        try {
            await deleteDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId));
            const msgsSnap = await getDocs(query(collection(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES), orderBy("createdAt", "desc")));
            if (msgsSnap.empty) {
                const uid = authUid;
                await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId), {
                    lastMessage: "",
                    lastMessageAt: null,
                    ...(uid ? { [`deletedFor.${uid}`]: true } : {})
                }).catch((err) => console.warn("Could not clear empty conversation summary:", err));
            } else {
                const latest = msgsSnap.docs[0].data();
                await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId), {
                    lastMessage: latest.text || "",
                    lastMessageAt: latest.createdAt || null
                }).catch((err) => console.warn("Could not update conversation snippet:", err));
            }
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("DeleteMessage fallback failed:", fallbackError);
            return { success: false, error: fallbackError.message || "Failed to delete message" };
        }
    }
};
export const reactToMessage = async (convoId: string, messageId: string, emoji: string, userId?: string) => {
    const authUid = AuthService.getUserId();
    const effectiveUid = authUid || userId;
    if (!effectiveUid) {
        return { success: false, error: "Authentication required" };
    }
    try {
        await apiClient.post(`/messaging/${convoId}/messages/${messageId}/react`, { emoji }, { timeout: 1500 });
        return { success: true, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend reactToMessage failed, attempting client-side fallback:", apiError);
        try {
            const messageRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId);
            const snap = await getDoc(messageRef);
            if (snap.exists()) {
                const reactions = { ...(snap.data().reactions ?? {}) };
                const currentList: string[] = reactions[emoji] ?? [];
                const alreadyReacted = currentList.includes(userId);

                if (alreadyReacted) {
                    // Toggle OFF — remove user from this emoji
                    const updated = currentList.filter((id: string) => id !== userId);
                    if (updated.length === 0) {
                        delete reactions[emoji];
                    } else {
                        reactions[emoji] = updated;
                    }
                } else {
                    // Toggle ON — remove user from any other emoji first, then add to this one
                    Object.keys(reactions).forEach((emojiKey) => {
                        if (emojiKey !== emoji) {
                            reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id: string) => id !== userId);
                            if (reactions[emojiKey].length === 0) {
                                delete reactions[emojiKey];
                            }
                        }
                    });
                    reactions[emoji] = [...(reactions[emoji] ?? []), userId];
                }

                await updateDoc(messageRef, { reactions, updatedAt: serverTimestamp() });
            }
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("ReactToMessage fallback failed:", fallbackError);
            return { success: false, error: fallbackError.message || "Failed to react to message" };
        }
    }
};
export const pinMessage = async (convoId: string, messageId: string) => {
    try {
        const messageRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId);
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) {
                throw new Error("Message not found");
            }
            const currentlyPinned = messageDoc.data()?.isPinned === true;
            transaction.update(messageRef, {
                isPinned: !currentlyPinned,
                updatedAt: serverTimestamp(),
            });
        });
        return { success: true, error: null };
    }
    catch (error: any) {
        console.error("pinMessage transaction failed:", error);
        return { success: false, error: error.message || "Failed to pin/unpin message" };
    }
};

export const subscribeToMessages = (conversationId: string, callback: (msgs: any) => void) => {
    const q = query(collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES), orderBy("createdAt", "asc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const messages = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            hasPendingWrites: d.metadata.hasPendingWrites,
        }));
        callback(messages);
    }, (error) => {
        console.error("Message subscription error:", error);
        callback([]);
    });
};
const participantProfilesCache = new Map<string, { data: any; ts: number }>();
const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000;

export const subscribeToConversations = (uid: string, callback: (convos: any[]) => void) => {
    const effectiveUid = AuthService.getUserId() || uid;
    if (!effectiveUid) {
        callback([]);
        return () => {};
    }
    const q = query(collection(db, COLLECTIONS.CONVERSATIONS), where("participants", "array-contains", effectiveUid));
    
    const buildAndEmit = (docsData: Array<{ id: string; data: any }>, profilesMap: Map<string, any>) => {
        const uniqueConvosMap = new Map<string, any>();
        
        docsData.forEach((item) => {
            const data = item.data;
            if (data.deletedFor && (data.deletedFor[uid] === true || (Array.isArray(data.deletedFor) && data.deletedFor.includes(uid)))) {
                return;
            }
            const participants = Array.isArray(data.participants) ? data.participants : [];
            const otherParticipantId = participants.find((p: string) => p !== uid);
            if (!otherParticipantId) return;

            const pData = profilesMap.get(otherParticipantId);
            const resolvedName = pData?.displayName ||
                pData?.name ||
                pData?.fullName ||
                [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') ||
                pData?.username ||
                (pData?.email ? pData.email.split('@')[0] : '') ||
                data.participantNames?.[otherParticipantId] ||
                data.participantDetails?.[otherParticipantId]?.name ||
                data.participantDetails?.[otherParticipantId]?.displayName ||
                (data.callerId === otherParticipantId ? data.callerName : data.calleeName) ||
                "User";

            const resolvedAvatar = pData?.image ||
                pData?.photoURL ||
                pData?.profileImage ||
                data.participantAvatars?.[otherParticipantId] ||
                data.participantDetails?.[otherParticipantId]?.avatar ||
                data.participantDetails?.[otherParticipantId]?.photoURL ||
                (data.callerId === otherParticipantId ? data.callerPhoto : data.calleePhoto) ||
                "";

            const participantInfo: any = {
                name: resolvedName,
                avatar: resolvedAvatar,
                gender: pData?.gender || "unknown",
                online: isUserOnline(pData),
                lastActive: pData?.lastActive || null,
                lastSeen: pData?.lastSeen || null,
            };

            let isUnreadForMe = false;
            const lastSender = data.lastSenderId;
            if (lastSender && lastSender !== uid) {
                if (data.readBy && typeof data.readBy === 'object' && !Array.isArray(data.readBy)) {
                    isUnreadForMe = data.readBy[uid] === false;
                }
                else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
                    isUnreadForMe = (data.unreadCounts[uid] || 0) > 0;
                }
                else if (typeof data.unread === 'boolean') {
                    isUnreadForMe = data.unread === true;
                }
                else if (typeof data.unread === 'number') {
                    isUnreadForMe = data.unread > 0;
                }
            }
            if (lastSender === uid)
                isUnreadForMe = false;

            const convoObj = {
                id: item.id,
                ...data,
                ...participantInfo,
                otherParticipantId,
                isUnreadForMe,
            };

            const existingConvo = uniqueConvosMap.get(otherParticipantId);
            if (!existingConvo) {
                uniqueConvosMap.set(otherParticipantId, convoObj);
            } else {
                const timeExisting = existingConvo.lastMessageAt?.toMillis?.() || (existingConvo.lastMessageAt?.seconds * 1000) || 0;
                const timeNew = convoObj.lastMessageAt?.toMillis?.() || (convoObj.lastMessageAt?.seconds * 1000) || 0;
                if (timeNew > timeExisting) {
                    uniqueConvosMap.set(otherParticipantId, convoObj);
                }
            }
        });

        const convos = Array.from(uniqueConvosMap.values());
        convos.sort((a: any, b: any) => {
            const timeA = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds * 1000 || 0;
            const timeB = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds * 1000 || 0;
            return timeB - timeA;
        });
        callback(convos);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const docsData = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
        const otherParticipantIds = docsData.map(item => {
            const participants = Array.isArray(item.data.participants) ? item.data.participants : [];
            return participants.find((p: string) => p !== uid);
        }).filter((pId): pId is string => typeof pId === 'string' && pId !== '');
        
        const uniqueParticipantIds = Array.from(new Set(otherParticipantIds));
        const profilesMap = new Map<string, any>();
        const now = Date.now();

        // 1. Populate already-cached profiles immediately
        const missingIds: string[] = [];
        for (const id of uniqueParticipantIds) {
            const cached = participantProfilesCache.get(id);
            if (cached && (now - cached.ts < PARTICIPANT_CACHE_TTL_MS)) {
                profilesMap.set(id, cached.data);
            } else {
                missingIds.push(id);
            }
        }
        
        // 2. Instant First Emission: Emit conversations immediately without waiting for missing network profile fetches!
        buildAndEmit(docsData, profilesMap);

        // 3. Non-blocking Background Profile Hydration
        if (missingIds.length > 0) {
            Promise.allSettled(missingIds.map(async (id) => {
                try {
                    const res = await getProfile(id);
                    let profileData: any = null;
                    if (res.data) {
                        profileData = res.data;
                    } else {
                        const uSnap = await getDoc(doc(db, COLLECTIONS.USERS, id));
                        if (uSnap.exists()) {
                            profileData = uSnap.data();
                        } else {
                            const pSnap = await getDoc(doc(db, COLLECTIONS.PROFILES, id));
                            if (pSnap.exists()) {
                                profileData = pSnap.data();
                            }
                        }
                    }
                    if (profileData) {
                        profilesMap.set(id, profileData);
                        participantProfilesCache.set(id, { data: profileData, ts: Date.now() });
                    }
                } catch (err) {
                    // ignore individual profile fetch error
                }
            })).then(() => {
                // Re-emit with enriched avatars/names once network requests resolve
                buildAndEmit(docsData, profilesMap);
            });
        }
    }, (error) => {
        console.error("Conversations subscription error:", error);
        callback([]);
    });
    return unsubscribe;
};
export const deleteConversation = async (convoId: string, currentUserId?: string) => {
    try {
        await apiClient.delete(`/messaging/${convoId}`, { timeout: 1500 });
        return { success: true, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend deleteConversation failed, attempting client-side fallback:", apiError);
        try {
            const uid = currentUserId || AuthService.getUserId();
            const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId);

            if (uid) {
                await updateDoc(convoRef, {
                    [`deletedFor.${uid}`]: true,
                    lastMessage: "",
                    lastMessageAt: null
                });
            }

            const msgsSnap = await getDocs(collection(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES));
            if (msgsSnap && !msgsSnap.empty) {
                await Promise.all(msgsSnap.docs.map(m => deleteDoc(m.ref)));
            }

            await deleteDoc(convoRef);
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("DeleteConversation fallback failed:", fallbackError);
            return { success: false, error: fallbackError.message || "Failed to delete conversation" };
        }
    }
};
export const blockUser = async (uid: string, targetId: string) => {
    try {
        await apiClient.post(`/users/block`, { targetId });
        return { success: true, error: null };
    }
    catch (error: unknown) {
        console.warn("Backend blockUser failed, attempting client-side fallback:", error);
        try {
            await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
                blockedUsers: arrayUnion(targetId),
                updatedAt: serverTimestamp()
            });
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("BlockUser fallback failed:", fallbackError);
            const message = error instanceof Error ? error.message : "Failed to block user";
            return { success: false, error: fallbackError.message || message };
        }
    }
};
export const unblockUser = async (uid: string, targetId: string) => {
    try {
        await apiClient.post(`/users/unblock`, { targetId });
        return { success: true, error: null };
    }
    catch (error: unknown) {
        console.warn("Backend unblockUser failed, attempting client-side fallback:", error);
        try {
            await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
                blockedUsers: arrayRemove(targetId),
                updatedAt: serverTimestamp()
            });
            return { success: true, error: null };
        }
        catch (fallbackError: any) {
            console.error("UnblockUser fallback failed:", fallbackError);
            const message = error instanceof Error ? error.message : "Failed to unblock user";
            return { success: false, error: fallbackError.message || message };
        }
    }
};
export const createConversation = async (participants: string[], initialMessage?: string, currentUserId?: string) => {
    try {
        const response = await apiClient.post<{
            id: string;
        }>("/messaging/conversations", {
            participants,
            initialMessage,
        }, { timeout: 1500 });
        if (!response?.data?.id || (response.data as any).proxy === 'offline') {
            throw new Error((response.data as any)?.message || "Backend proxy offline");
        }
        return { id: response.data.id, error: null };
    }
    catch (apiError: any) {
        console.warn("Backend createConversation failed, attempting client-side fallback:", apiError);
        if (apiError.response?.status === 403 || apiError.response?.status === 401) {
            return { id: null, error: apiError.response.data?.error || "Action forbidden" };
        }
        const currentUserUid = currentUserId || AuthService.getUserId() || (participants && participants[0]);
        if (!currentUserUid) {
            return { id: null, error: "Authentication required" };
        }
        const uniqueParticipants = Array.from(new Set(participants));
        if (!uniqueParticipants.includes(currentUserUid)) {
            return { id: null, error: "Conversation must include authenticated user" };
        }
        if (uniqueParticipants.length < 2) {
            return { id: null, error: "Conversation requires at least two participants" };
        }
        const otherParticipants = uniqueParticipants.filter(p => p !== currentUserUid);
        const [currentUserSnap, ...participantSnaps] = await Promise.all([
            getDoc(doc(db, COLLECTIONS.USERS, currentUserUid)),
            ...otherParticipants.map(pId => getDoc(doc(db, COLLECTIONS.USERS, pId)))
        ]);
        const currentUserBlocked = currentUserSnap.exists() ? (currentUserSnap.data().blockedUsers || []) : [];
        for (let i = 0; i < otherParticipants.length; i++) {
            const participantId = otherParticipants[i];
            const participantSnap = participantSnaps[i];
            if (participantSnap.exists()) {
                const blockedUsers: string[] = participantSnap.data().blockedUsers || [];
                if (blockedUsers.includes(currentUserUid)) {
                    return { id: null, error: "You cannot message this user" };
                }
            }
            if (currentUserBlocked.includes(participantId)) {
                return { id: null, error: "You have blocked this user" };
            }
        }
        const sorted = uniqueParticipants.slice().sort();
        const deterministicId = sorted.length === 2 ? `${sorted[0]}_${sorted[1]}` : null;

        try {
            // Fast O(1) direct document lookup
            if (deterministicId) {
                const directSnap = await getDoc(doc(db, COLLECTIONS.CONVERSATIONS, deterministicId));
                if (directSnap.exists()) {
                    return { id: directSnap.id, error: null };
                }
            }

            // Fallback search for legacy random-ID conversations
            const q = query(collection(db, COLLECTIONS.CONVERSATIONS), where("participants", "array-contains", currentUserUid));
            const snapshot = await getDocs(q);
            const existing = snapshot.docs.find((doc) => {
                const p = doc.data().participants;
                if (!Array.isArray(p) || p.length !== sorted.length) {
                    return false;
                }
                const normalized = [...p].sort();
                return normalized.every((item, index) => item === sorted[index]);
            });
            if (existing) {
                return { id: existing.id, error: null };
            }

            const convoDocRef = deterministicId
                ? doc(db, COLLECTIONS.CONVERSATIONS, deterministicId)
                : doc(collection(db, COLLECTIONS.CONVERSATIONS));

            await setDoc(convoDocRef, {
                participants: sorted,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: "",
                lastMessageAt: serverTimestamp(),
            }, { merge: true });
            const convoId = convoDocRef.id;
            // Conversation notifications removed per user request
            if (initialMessage) {
                await sendMessage(convoId, "system", initialMessage, true);
            }
            return { id: convoId, error: null };
        }
        catch (fallbackError: any) {
            console.error("CreateConversation fallback failed:", fallbackError);
            return { id: null, error: fallbackError.message || "Failed to create conversation" };
        }
    }
};
export const markConversationAsRead = async (convoId: string, currentUserId?: string) => {
    try {
        const uid = currentUserId || AuthService.getUserId();
        if (uid && convoId) {
            const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId);
            const snap = await getDoc(convoRef);
            if (snap.exists()) {
                const data = snap.data();
                const updatePayload: Record<string, any> = {};
                if (data.readBy && typeof data.readBy === 'object') {
                    updatePayload[`readBy.${uid}`] = true;
                }
                if (data.unreadCounts && typeof data.unreadCounts === 'object') {
                    updatePayload[`unreadCounts.${uid}`] = 0;
                }
                if (data.lastSenderId !== uid) {
                    updatePayload['unread'] = false;
                }
                if (Object.keys(updatePayload).length > 0) {
                    await updateDoc(convoRef, updatePayload);
                }
            }
        }
        await apiClient.put(`/messaging/${convoId}/read`, {}, { timeout: 1500 });
        return { success: true, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to mark conversation as read';
        console.error('markConversationAsRead error:', message);
        return { success: false, error: message };
    }
};
