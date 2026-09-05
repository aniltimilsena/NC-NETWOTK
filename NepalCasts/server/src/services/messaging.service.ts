import { db, admin } from '../config';
import { sendFcmMulticastNotification, sendOneSignalNotification } from './notification.service';
function formatMessagePreview(text: string): string {
    if (!text)
        return '';
    if (typeof text !== 'string')
        return String(text);
    const trimmed = text.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('/video/')) {
            return ' Sent a video';
        }
        if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('/image/') || lower.includes('cloudinary')) {
            return ' Sent a photo';
        }
        return ' Sent a link';
    }
    return text;
}
export const assertParticipant = async (conversationId: string, userId: string): Promise<admin.firestore.DocumentSnapshot> => {
    const convoDoc = await db.collection('conversations').doc(conversationId).get();
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
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    const otherParticipantId = sorted.find((p) => p !== uid);
    if (otherParticipantId) {
        let senderName = "Someone";
        let senderAvatar = "";
        try {
            const profileSnap = await db.collection('profiles').doc(uid).get();
            if (profileSnap.exists) {
                const pData = profileSnap.data();
                senderName = pData?.name || [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') || pData?.username || senderName;
                senderAvatar = pData?.image || pData?.photoURL || pData?.avatar || senderAvatar;
            }
        }
        catch (e) {
            console.warn("Error fetching profile for new convo notification:", e);
        }
        await db.collection('notifications').add({
            userId: otherParticipantId,
            recipientId: otherParticipantId,
            receiverId: otherParticipantId,
            senderId: uid,
            senderName,
            senderAvatar,
            title: "New Conversation",
            body: `${senderName} started a new conversation with you.`,
            type: "messages",
            notificationType: "messages",
            isRead: false,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            targetUrl: `/messages/${uid}`,
            profileUrl: `/messages/${uid}`,
            pushSent: true
        });
        const tokenDoc = await db.collection('users').doc(otherParticipantId).collection('private').doc('settings').get();
        const allTokens: string[] = [];
        if (tokenDoc.exists) {
            const data = tokenDoc.data();
            if (data?.fcmTokens && Array.isArray(data.fcmTokens)) {
                allTokens.push(...data.fcmTokens);
            }
        }
        if (allTokens.length > 0) {
            await sendFcmMulticastNotification(allTokens, 'New Conversation', `${senderName} started a new conversation with you.`, `/messages/${uid}`);
        }
        sendOneSignalNotification({
            userIds: [otherParticipantId],
            title: 'New Conversation',
            body: `${senderName} started a new conversation with you.`,
            url: `/messages/${uid}`,
            buttons: [
                { id: 'view_chat', text: 'Open Chat' }
            ]
        });
    }
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
    const convo = await assertParticipant(conversationId, uid);
    const convoData = convo.data();
    if (convoData?.createdBy === uid) {
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
    else {
        await convo.ref.update({
            [`deletedFor.${uid}`]: true
        });
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
export const sendMessageInConversation = async (conversationId: string, uid: string, validatedData: any, userObj: any): Promise<void> => {
    const convoDoc = await assertParticipant(conversationId, uid);
    const participants = convoDoc.data()?.participants || [];
    const otherParticipants = participants.filter((p: string) => p !== uid);
    await checkBlockStatus(uid, otherParticipants);
    const isSystem = validatedData.isSystem || uid === 'system';
    const newMessage = {
        senderId: isSystem ? 'system' : uid,
        text: validatedData.text,
        type: validatedData.type,
        isSystem,
        replyTo: validatedData.replyTo || null,
        reactions: {},
        read: false,
        delivered: false,
        clientMsgId: validatedData.clientMsgId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('conversations')
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
    if (otherParticipants.length > 0) {
        for (const otherParticipantId of otherParticipants) {
            let senderName = userObj?.name || "Someone";
            let senderAvatar = userObj?.picture || "";
            try {
                const profileSnap = await db.collection('profiles').doc(uid).get();
                if (profileSnap.exists) {
                    const pData = profileSnap.data();
                    senderName = pData?.name || [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') || pData?.username || senderName;
                    senderAvatar = pData?.image || pData?.photoURL || pData?.avatar || senderAvatar;
                }
            }
            catch (e) {
                console.warn("Error fetching profile for notification:", e);
            }
            let title = "New Message";
            let body = validatedData.text;
            if (validatedData.type === "image") {
                title = "Media received";
                body = "Sent an image";
            }
            else if (validatedData.type === "video") {
                title = "Media received";
                body = "Sent a video";
            }
            await db.collection('notifications').add({
                userId: otherParticipantId,
                recipientId: otherParticipantId,
                receiverId: otherParticipantId,
                senderId: uid,
                senderName,
                senderAvatar,
                title,
                body,
                type: "messages",
                notificationType: "messages",
                isRead: false,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                targetUrl: `/messages/${conversationId}`,
                profileUrl: `/messages/${conversationId}`,
                pushSent: true
            });
        }
        const allTokens: string[] = [];
        await Promise.all(otherParticipants.map(async (pId: string) => {
            const tokenDoc = await db.collection('users').doc(pId).collection('private').doc('settings').get();
            if (tokenDoc.exists) {
                const data = tokenDoc.data();
                if (data?.fcmTokens && Array.isArray(data.fcmTokens)) {
                    allTokens.push(...data.fcmTokens);
                }
            }
        }));
        if (allTokens.length > 0) {
            const preview = formatMessagePreview(validatedData.text);
            await sendFcmMulticastNotification(allTokens, 'New Message', preview.length > 50 ? `${preview.substring(0, 47)}...` : preview, `/messages/${conversationId}`);
        }
        const preview = formatMessagePreview(validatedData.text);
        sendOneSignalNotification({
            userIds: otherParticipants,
            title: 'New Message',
            body: preview.length > 50 ? `${preview.substring(0, 47)}...` : preview,
            url: `/messages/${conversationId}`,
            buttons: [
                { id: 'reply_chat', text: 'Reply' },
                { id: 'view_chat', text: 'Open Chat' }
            ]
        });
    }
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
