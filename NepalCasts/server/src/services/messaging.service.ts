import { db, admin } from '../config';

export const assertParticipant = async (conversationId: string, userId: string): Promise<admin.firestore.DocumentSnapshot> => {
    let convoDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convoDoc.exists) {
        if (conversationId.startsWith('app_')) {
            const appId = conversationId.replace('app_', '');
            const appDoc = await db.collection('applications').doc(appId).get();
            if (appDoc.exists) {
                const appData = appDoc.data();
                const participants = [appData?.userId, appData?.creatorId].filter(Boolean);
                if (participants.includes(userId)) {
                    await db.collection('conversations').doc(conversationId).set({
                        participants,
                        type: 'application',
                        isApplication: true,
                        applicationId: appId,
                        castingId: appData?.castingId || null,
                        castingTitle: appData?.castingTitle || null,
                        roleName: appData?.roleName || null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastMessage: '',
                        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    convoDoc = await db.collection('conversations').doc(conversationId).get();
                }
            }
        } else if (conversationId.includes('_')) {
            const parts = conversationId.split('_');
            if (parts.length === 2 && parts.includes(userId)) {
                await db.collection('conversations').doc(conversationId).set({
                    participants: parts,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastMessage: '',
                    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                convoDoc = await db.collection('conversations').doc(conversationId).get();
            }
        }
    }
    if (!convoDoc.exists) {
        throw { status: 404, message: 'Conversation not found' };
    }
    const participants = convoDoc.data()?.participants || [];
    if (!participants.includes(userId)) {
        throw { status: 403, message: 'Forbidden: You are not a participant' };
    }
    return convoDoc;
};
export const assertMessageOwner = async (conversationId: string, messageId: string, userId: string): Promise<admin.firestore.DocumentSnapshot> => {
    await assertParticipant(conversationId, userId);
    const msgDoc = await db
        .collection('conversations').doc(conversationId)
        .collection('messages').doc(messageId)
        .get();
    if (!msgDoc.exists) {
        throw { status: 404, message: 'Message not found' };
    }
    if (msgDoc.data()?.senderId !== userId) {
        throw { status: 403, message: 'Forbidden: You did not send this message' };
    }
    return msgDoc;
};
export const checkBlockStatus = async (uid: string, otherParticipants: string[]): Promise<void> => {
    const requesterDoc = await db.collection('users').doc(uid).get();
    const requesterBlocked: string[] = requesterDoc.exists ? (requesterDoc.data()?.blockedUsers || []) : [];
    for (const participantId of otherParticipants) {
        if (requesterBlocked.includes(participantId)) {
            throw { status: 403, message: 'You have blocked this user' };
        }
        const participantDoc = await db.collection('users').doc(participantId).get();
        if (participantDoc.exists) {
            const blockedUsers: string[] = participantDoc.data()?.blockedUsers || [];
            if (blockedUsers.includes(uid)) {
                throw { status: 403, message: 'You cannot message this user' };
            }
        }
    }
};
export const getConversationsForUser = async (uid: string): Promise<any[]> => {
    const snapshot = await db.collection('conversations')
        .where('participants', 'array-contains', uid)
        .get();
    return snapshot.docs
        .filter((doc) => {
            const data = doc.data();
            if (data.deletedFor && (data.deletedFor[uid] === true || (Array.isArray(data.deletedFor) && data.deletedFor.includes(uid)))) {
                return false;
            }
            return true;
        })
        .map((doc) => ({ id: doc.id, ...doc.data() }));
};
export const createConversation = async (uid: string, participants: string[], initialMessage?: string): Promise<string> => {
    const uniqueParticipants = Array.from(new Set(participants));
    if (!uniqueParticipants.includes(uid)) {
        throw { status: 400, message: "Conversation must include the authenticated user" };
    }
    const otherParticipants = uniqueParticipants.filter(p => p !== uid);
    await checkBlockStatus(uid, otherParticipants);
    const sorted = uniqueParticipants.slice().sort();
    const deterministicId = sorted.length === 2 ? `${sorted[0]}_${sorted[1]}` : null;
    
    // Fast O(1) direct document lookup
    if (deterministicId) {
        const directDoc = await db.collection('conversations').doc(deterministicId).get();
        if (directDoc.exists) {
            return directDoc.id;
        }
    }

    // Fallback search for legacy random-ID conversations
    const snapshot = await db.collection('conversations')
        .where('participants', 'array-contains', uid)
        .get();
    const existing = snapshot.docs.find((doc) => {
        const p = doc.data().participants;
        if (!Array.isArray(p) || p.length !== sorted.length) {
            return false;
        }
        const normalized = [...p].sort();
        return normalized.every((item, index) => item === sorted[index]);
    });
    if (existing) {
        return existing.id;
    }

    const docRef = deterministicId
        ? db.collection('conversations').doc(deterministicId)
        : db.collection('conversations').doc();

    await docRef.set({
        createdBy: uid,
        participants: sorted,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Message/conversation notifications removed per user request
    if (initialMessage) {
        const newMessage = {
            senderId: 'system',
            text: initialMessage,
            isSystem: true,
            type: 'text',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection('conversations').doc(docRef.id).collection('messages').add(newMessage);
        await db.collection('conversations').doc(docRef.id).update({
            lastMessage: initialMessage,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            unread: true,
            lastSenderId: 'system',
        });
    }
    return docRef.id;
};
export const deleteConversationForUser = async (conversationId: string, uid: string): Promise<void> => {
    try {
        const convo = await assertParticipant(conversationId, uid);
        // Delete all messages in subcollection first to avoid orphaned records in Firestore
        try {
            const messagesSnap = await convo.ref.collection('messages').get();
            if (!messagesSnap.empty) {
                let batch = db.batch();
                let count = 0;
                for (const doc of messagesSnap.docs) {
                    batch.delete(doc.ref);
                    count++;
                    if (count === 400) {
                        await batch.commit();
                        batch = db.batch();
                        count = 0;
                    }
                }
                if (count > 0) {
                    await batch.commit();
                }
            }
        }
        catch (msgErr) {
            console.warn(`Error deleting messages subcollection for conversation ${conversationId}:`, msgErr);
        }
        await convo.ref.delete();
    }
    catch (err: any) {
        if (err?.status === 404) {
            // Already deleted or not found
            return;
        }
        throw err;
    }

    if (conversationId.startsWith('app_')) {
        const appId = conversationId.replace('app_', '');
        try {
            await db.collection('applications').doc(appId).update({
                [`deletedFor.${uid}`]: true
            });
        }
        catch (appErr) {
            // ignore if app doc missing
        }
    }
};
export const getMessagesInConversation = async (conversationId: string, uid: string): Promise<any[]> => {
    const convoDoc = await assertParticipant(conversationId, uid);
    try {
        await convoDoc.ref.update({
            [`readBy.${uid}`]: true,
            [`unreadCounts.${uid}`]: 0,
        });
    } catch (e) {
        console.warn("Could not reset unread count for conversation:", e);
    }
    const snapshot = await db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
export const sendMessageInConversation = async (conversationId: string, uid: string, validatedData: any, userObj: any): Promise<any> => {
    const convoDoc = await assertParticipant(conversationId, uid);
    const participants = convoDoc.data()?.participants || [];
    const otherParticipants = participants.filter((p: string) => p !== uid);
    await checkBlockStatus(uid, otherParticipants);
    const isSystem = validatedData.isSystem || uid === 'system';
    const now = new Date();
    const newMessage = {
        senderId: isSystem ? 'system' : uid,
        text: validatedData.text,
        type: validatedData.type || 'text',
        isSystem,
        replyTo: validatedData.replyTo || null,
        reactions: {},
        read: false,
        delivered: false,
        clientMsgId: validatedData.clientMsgId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const msgRef = await db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add(newMessage);
    const convoUpdate: any = {
        lastMessage: validatedData.text,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageDelivered: false,
        lastMessageRead: false,
    };
    convoUpdate[`readBy.${uid}`] = true;
    convoUpdate[`unreadCounts.${uid}`] = 0;
    participants.forEach((pId: string) => {
        if (pId !== uid) {
            convoUpdate[`readBy.${pId}`] = false;
            convoUpdate[`unreadCounts.${pId}`] = admin.firestore.FieldValue.increment(1);
        }
    });
    await db.collection('conversations')
        .doc(conversationId)
        .update(convoUpdate);
    return {
        id: msgRef.id,
        ...newMessage,
        createdAt: now.toISOString(),
    };
};
export const updateMessageText = async (conversationId: string, messageId: string, uid: string, text: string): Promise<void> => {
    const msg = await assertMessageOwner(conversationId, messageId, uid);
    await msg.ref.update({
        text,
        edited: true,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
export const deleteMessageText = async (conversationId: string, messageId: string, uid: string): Promise<void> => {
    const msg = await assertMessageOwner(conversationId, messageId, uid);
    await msg.ref.update({
        text: '',
        deleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
export const reactToMessageId = async (conversationId: string, messageId: string, uid: string, emoji: string): Promise<void> => {
    await assertParticipant(conversationId, uid);
    const messageRef = db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);
    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
        throw { status: 404, message: 'Message not found' };
    }
    await messageRef.update({
        [`reactions.${uid}`]: emoji,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
export const removeReactionFromMessageId = async (conversationId: string, messageId: string, uid: string): Promise<void> => {
    await assertParticipant(conversationId, uid);
    const messageRef = db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);
    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
        throw { status: 404, message: 'Message not found' };
    }
    await messageRef.update({
        [`reactions.${uid}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
export const pinMessageId = async (conversationId: string, messageId: string, uid: string, pinned: boolean): Promise<void> => {
    await assertParticipant(conversationId, uid);
    const messageRef = db.collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);
    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
        throw { status: 404, message: 'Message not found' };
    }
    const shouldPin = !!pinned;
    await messageRef.update({
        pinned: shouldPin,
        pinnedBy: shouldPin ? uid : null,
        pinnedAt: shouldPin ? admin.firestore.FieldValue.serverTimestamp() : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
export const markConversationRead = async (conversationId: string, uid: string): Promise<void> => {
    await assertParticipant(conversationId, uid);
    await db.collection('conversations')
        .doc(conversationId)
        .update({
        [`unreadCounts.${uid}`]: 0,
        [`readBy.${uid}`]: true,
        [`lastReadAt.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
    });
};
