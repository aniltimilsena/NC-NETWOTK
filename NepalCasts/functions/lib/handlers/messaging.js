"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageCreated = exports.unblockUser = exports.blockUser = exports.pinMessage = exports.reactToMessage = exports.deleteMessage = exports.updateMessage = exports.sendMessage = exports.deleteConversation = exports.createOrGetConversation = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const config_1 = require("../config");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../lib/rateLimit");
const schemas_1 = require("../schemas");
exports.createOrGetConversation = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.ConversationSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid conversation payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "createOrGetConversation", 30, 60);
    const uniqueParticipants = Array.from(new Set(parsed.data.participants));
    if (!uniqueParticipants.includes(authCtx.uid)) {
        throw new https_1.HttpsError("permission-denied", "Conversation must include authenticated user");
    }
    if (uniqueParticipants.length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Conversation requires at least two participants");
    }
    const sorted = uniqueParticipants.slice().sort();
    const snapshot = await config_1.db.collection("conversations").where("participants", "array-contains", authCtx.uid).get();
    const existing = snapshot.docs.find((doc) => {
        const participants = doc.data().participants;
        if (!Array.isArray(participants) || participants.length !== sorted.length) {
            return false;
        }
        const normalized = [...participants].sort();
        return normalized.every((item, index) => item === sorted[index]);
    });
    if (existing) {
        return { id: existing.id, created: false };
    }
    const convoRef = await config_1.db.collection("conversations").add({
        participants: sorted,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
        lastMessage: "",
        lastMessageAt: firestore_2.FieldValue.serverTimestamp(),
    });
    await (0, rateLimit_1.logSecurityEvent)("conversation.create", "info", authCtx.uid, { conversationId: convoRef.id, participantCount: sorted.length });
    return { id: convoRef.id, created: true };
});
exports.deleteConversation = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = zod_1.z.object({ conversationId: zod_1.z.string().min(1) }).safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid delete conversation payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "deleteConversation", 10, 60);
    const { convoRef } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
    await convoRef.delete();
    await (0, rateLimit_1.logSecurityEvent)("conversation.delete", "warning", authCtx.uid, { conversationId: parsed.data.conversationId });
    return { success: true };
});
exports.sendMessage = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    try {
        const authCtx = (0, validation_1.assertAuth)(request.auth);
        const parsed = schemas_1.MessageSendSchema.safeParse(request.data);
        if (!parsed.success) {
            logger.error("SendMessage: Invalid payload", { errors: parsed.error.format() });
            throw new https_1.HttpsError("invalid-argument", "Invalid message payload");
        }
        await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "sendMessage", 60, 60);
        const { convoRef, participants } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
        const message = {
            senderId: authCtx.uid,
            text: parsed.data.text,
            isSystem: parsed.data.isSystem,
            type: parsed.data.type,
            replyTo: parsed.data.replyTo ?? null,
            reactions: {},
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        };
        await convoRef.collection("messages").add(message);
        await convoRef.set({
            lastMessage: parsed.data.text,
            lastMessageAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            unread: true,
        }, { merge: true });
        await (0, rateLimit_1.logSecurityEvent)("message.send", "info", authCtx.uid, {
            conversationId: parsed.data.conversationId,
            participantCount: participants.length,
            type: parsed.data.type,
            isSystem: parsed.data.isSystem,
        });
        return { success: true };
    }
    catch (error) {
        logger.error("SendMessage: Internal Error", {
            message: error.message,
            code: error.code,
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Message sending failed");
    }
});
exports.updateMessage = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.MessageUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message update payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "updateMessage", 30, 60);
    const { convoRef } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
        throw new https_1.HttpsError("not-found", "Message not found");
    }
    if (messageSnap.data()?.senderId !== authCtx.uid) {
        throw new https_1.HttpsError("permission-denied", "Only message sender can edit this message");
    }
    await messageRef.set({
        text: parsed.data.text,
        isEdited: true,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("message.update", "info", authCtx.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
    });
    return { success: true };
});
exports.deleteMessage = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.MessageDeleteSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message delete payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "deleteMessage", 20, 60);
    const { convoRef } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
        throw new https_1.HttpsError("not-found", "Message not found");
    }
    if (messageSnap.data()?.senderId !== authCtx.uid) {
        throw new https_1.HttpsError("permission-denied", "Only message sender can delete this message");
    }
    await messageRef.delete();
    await (0, rateLimit_1.logSecurityEvent)("message.delete", "warning", authCtx.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
    });
    return { success: true };
});
exports.reactToMessage = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.MessageReactionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message reaction payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "reactToMessage", 60, 60);
    const { convoRef } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    await config_1.db.runTransaction(async (transaction) => {
        const messageSnap = await transaction.get(messageRef);
        if (!messageSnap.exists) {
            throw new https_1.HttpsError("not-found", "Message not found");
        }
        const messageData = messageSnap.data();
        const reactions = { ...(messageData.reactions ?? {}) };
        Object.keys(reactions).forEach((emojiKey) => {
            reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id) => id !== authCtx.uid);
            if (reactions[emojiKey].length === 0) {
                delete reactions[emojiKey];
            }
        });
        reactions[parsed.data.emoji] = [...(reactions[parsed.data.emoji] ?? []), authCtx.uid];
        transaction.set(messageRef, {
            reactions,
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    await (0, rateLimit_1.logSecurityEvent)("message.react", "info", authCtx.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
    });
    return { success: true };
});
exports.pinMessage = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.MessagePinSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid pin payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "pinMessage", 30, 60);
    const { convoRef } = await (0, validation_1.assertConversationParticipant)(parsed.data.conversationId, authCtx.uid);
    await convoRef.collection("messages").doc(parsed.data.messageId).set({
        isPinned: parsed.data.pinned,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("message.pin", "info", authCtx.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
        pinned: parsed.data.pinned,
    });
    return { success: true };
});
exports.blockUser = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.BlockUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid block user payload");
    }
    if (parsed.data.targetId === authCtx.uid) {
        throw new https_1.HttpsError("invalid-argument", "Cannot block yourself");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "blockUser", 30, 60);
    await config_1.db.collection("users").doc(authCtx.uid).set({
        blockedUsers: firestore_2.FieldValue.arrayUnion(parsed.data.targetId),
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("user.block", "warning", authCtx.uid, { targetId: parsed.data.targetId });
    return { success: true };
});
exports.unblockUser = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.BlockUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid unblock user payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "unblockUser", 30, 60);
    await config_1.db.collection("users").doc(authCtx.uid).set({
        blockedUsers: firestore_2.FieldValue.arrayRemove(parsed.data.targetId),
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("user.unblock", "info", authCtx.uid, { targetId: parsed.data.targetId });
    return { success: true };
});
exports.onMessageCreated = (0, firestore_1.onDocumentCreated)({
    document: "conversations/{convoId}/messages/{messageId}",
    region: config_1.DEFAULT_REGION,
    maxInstances: 10,
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.warn("No snapshot data found");
        return;
    }
    const messageData = snapshot.data();
    if (!messageData) {
        logger.warn("No message data found");
        return;
    }
    if (messageData.isSystem || messageData.senderId === "system") {
        return;
    }
    const convoId = event.params.convoId;
    const senderId = messageData.senderId;
    const text = messageData.text || "";
    const type = messageData.type || "text";
    try {
        const convoRef = config_1.db.collection("conversations").doc(convoId);
        const convoSnap = await convoRef.get();
        if (!convoSnap.exists) {
            logger.warn(`Conversation ${convoId} not found`);
            return;
        }
        const participants = convoSnap.data()?.participants;
        if (!Array.isArray(participants)) {
            logger.warn(`No participants found in conversation ${convoId}`);
            return;
        }
        const otherParticipants = participants.filter((uid) => uid !== senderId);
        if (otherParticipants.length === 0) {
            return;
        }
        let senderName = "Someone";
        try {
            const senderSnap = await config_1.db.collection("profiles").doc(senderId).get();
            if (senderSnap.exists) {
                const sData = senderSnap.data();
                senderName = sData?.name || [sData?.firstName, sData?.lastName].filter(Boolean).join(" ") || sData?.username || senderName;
            }
        }
        catch (e) {
            logger.error("Error fetching sender profile:", e);
        }
        let preview = text;
        if (type === "image") {
            preview = "📷 Sent a photo";
        }
        else if (type === "video") {
            preview = "🎥 Sent a video";
        }
        const appId = process.env.ONESIGNAL_APP_ID || "a9962176-972c-4874-8161-ec84428e9036";
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
        if (!restApiKey) {
            logger.warn("⚠️ OneSignal REST API Key is not configured in Cloud Functions environment variables.");
            return;
        }
        const payload = {
            app_id: appId,
            contents: { en: preview },
            headings: { en: `New Message from ${senderName}` },
            url: `${process.env.APP_URL || "https://nc-netwotk.vercel.app"}/messages/${convoId}`,
            include_aliases: {
                external_id: otherParticipants,
            },
            target_channel: "push",
        };
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${restApiKey}`,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            logger.error("❌ OneSignal Notification failed:", data);
        }
        else {
            logger.info("🚀 OneSignal Notification sent successfully:", data);
        }
    }
    catch (err) {
        logger.error("Error processing onMessageCreated trigger:", err);
    }
});
//# sourceMappingURL=messaging.js.map