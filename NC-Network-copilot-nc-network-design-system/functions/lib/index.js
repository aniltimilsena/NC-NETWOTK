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
exports.adminRejectDataRequest = exports.adminApproveDataRequest = exports.adminUpdateUserRole = exports.adminUnbanUser = exports.adminBanUser = exports.adminDeleteUser = exports.checkExpiredBans = exports.onMessageCreated = exports.adminSetCastingPriority = exports.adminDeleteCastingCall = exports.adminUpdateCastingCall = exports.adminCreateCastingCall = exports.registerNotificationToken = exports.blockUser = exports.pinMessage = exports.reactToMessage = exports.deleteMessage = exports.updateMessage = exports.sendMessage = exports.deleteConversation = exports.createOrGetConversation = exports.upsertProfile = exports.bootstrapUserProfile = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const MAX_FCM_TOKENS = 20;
const DEFAULT_REGION = process.env.FUNCTIONS_REGION ?? "us-central1";
const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";
const callableOptions = {
    region: DEFAULT_REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    maxInstances: 20,
};
const ProfileUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120).optional(),
    firstName: zod_1.z.string().max(120).optional(),
    lastName: zod_1.z.string().max(120).optional(),
    username: zod_1.z.string().max(60).optional(),
    phone: zod_1.z.string().max(30).optional(),
    gender: zod_1.z.string().max(30).optional(),
    bio: zod_1.z.string().max(500).optional(),
    role: zod_1.z.string().max(60).optional(),
    location: zod_1.z.string().max(120).optional(),
    languages: zod_1.z.array(zod_1.z.string().max(60)).max(20).optional(),
    skills: zod_1.z.array(zod_1.z.union([zod_1.z.string().max(80), zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())])).max(50).optional(),
    experience: zod_1.z.array(zod_1.z.unknown()).max(50).optional(),
    openToWork: zod_1.z.boolean().optional(),
    height: zod_1.z.string().max(20).optional().nullable(),
    weight: zod_1.z.string().max(20).optional().nullable(),
    eyeColor: zod_1.z.string().max(40).optional(),
    hairColor: zod_1.z.string().max(40).optional(),
    image: zod_1.z.string().url().optional().nullable(),
    coverImage: zod_1.z.string().url().optional().nullable(),
    email: zod_1.z.string().email().optional(),
    media: zod_1.z.array(zod_1.z.string().url()).max(20).optional(),
});
const BootstrapUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    role: zod_1.z.string().max(60).optional(),
    gender: zod_1.z.string().max(30).optional(),
    email: zod_1.z.string().email().optional(),
});
const ConversationSchema = zod_1.z.object({
    participants: zod_1.z.array(zod_1.z.string().min(1)).min(2).max(10),
});
const MessageSendSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1).max(2000),
    type: zod_1.z.enum(["text", "image", "file"]).optional().default("text"),
    isSystem: zod_1.z.boolean().optional().default(false),
    replyTo: zod_1.z
        .object({
        id: zod_1.z.string().min(1),
        text: zod_1.z.string().max(2000),
        senderId: zod_1.z.string().min(1),
    })
        .optional(),
});
const MessageUpdateSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1).max(2000),
});
const MessageDeleteSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
});
const MessageReactionSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    emoji: zod_1.z.string().min(1).max(16),
});
const MessagePinSchema = zod_1.z.object({
    conversationId: zod_1.z.string().min(1),
    messageId: zod_1.z.string().min(1),
    pinned: zod_1.z.boolean(),
});
const NotificationTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(50).max(4096),
});
const BlockUserSchema = zod_1.z.object({
    targetId: zod_1.z.string().min(1),
});
const AdminCastingSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(140),
    description: zod_1.z.string().min(20).max(5000),
    type: zod_1.z.enum(["Film", "Commercial", "Web Series", "Theatre"]),
    budget: zod_1.z.string().max(120).optional(),
    location: zod_1.z.string().min(2).max(120),
    highPriority: zod_1.z.boolean().optional().default(false),
});
const AdminCastingUpdateSchema = AdminCastingSchema.partial().extend({
    id: zod_1.z.string().min(1),
});
const AdminCastingDeleteSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
const AdminCastingPrioritySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    highPriority: zod_1.z.boolean(),
});
const AdminUserActionSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
});
const AdminBanUserSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    reason: zod_1.z.string().optional(),
    duration: zod_1.z.string().optional(),
});
const AdminUpdateUserRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    makeAdmin: zod_1.z.boolean(),
});
const AdminDataRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1),
    reason: zod_1.z.string().optional(),
});
const assertAuth = (auth) => {
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    return { uid: auth.uid, token: auth.token ?? {} };
};
const enforceRateLimit = async (uid, action, maxRequests, windowSeconds) => {
    const nowMs = Date.now();
    const windowStartMs = nowMs - windowSeconds * 1000;
    const rateRef = db.collection("securityRateLimits").doc(`${action}:${uid}`);
    await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(rateRef);
        const data = snap.data();
        const firstRequestAtMs = data?.firstRequestAt?.toMillis?.() ?? nowMs;
        const isWindowExpired = firstRequestAtMs < windowStartMs;
        const nextCount = isWindowExpired ? 1 : (data?.count ?? 0) + 1;
        if (nextCount > maxRequests) {
            throw new https_1.HttpsError("resource-exhausted", `Rate limit exceeded for action ${action}`);
        }
        transaction.set(rateRef, {
            action,
            uid,
            count: nextCount,
            firstRequestAt: isWindowExpired ? firestore_1.Timestamp.fromMillis(nowMs) : data?.firstRequestAt ?? firestore_1.Timestamp.fromMillis(nowMs),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
};
const logSecurityEvent = async (eventType, severity, uid, details) => {
    logger.log("security_event", { eventType, severity, uid, ...details });
    await db.collection("securityEvents").add({
        eventType,
        severity,
        uid,
        details,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
};
const assertConversationParticipant = async (conversationId, uid) => {
    const convoRef = db.collection("conversations").doc(conversationId);
    const convoSnap = await convoRef.get();
    if (!convoSnap.exists) {
        throw new https_1.HttpsError("not-found", "Conversation not found");
    }
    const participants = convoSnap.data()?.participants;
    if (!Array.isArray(participants) || !participants.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "Not a participant of this conversation");
    }
    return { convoRef, participants: participants };
};
const assertAdmin = async (auth) => {
    if (auth.token.admin === true) {
        return;
    }
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (userDoc.exists && userDoc.data()?.isAdmin === true) {
        try {
            await (0, auth_1.getAuth)().setCustomUserClaims(auth.uid, { admin: true });
        }
        catch (err) {
            logger.error(`Failed to auto-set custom claim for user ${auth.uid}:`, err);
        }
        return;
    }
    throw new https_1.HttpsError("permission-denied", "Admin role required");
};
exports.bootstrapUserProfile = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = BootstrapUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user profile payload");
    }
    await enforceRateLimit(auth.uid, "bootstrapUserProfile", 5, 60);
    const now = firestore_1.FieldValue.serverTimestamp();
    const profileName = parsed.data.name;
    const role = parsed.data.role ?? "Talent";
    const gender = parsed.data.gender ?? "";
    const authEmail = typeof auth.token.email === "string" ? auth.token.email : null;
    const email = parsed.data.email ?? authEmail;
    await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(auth.uid);
        const profileRef = db.collection("profiles").doc(auth.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            transaction.set(userRef, {
                uid: auth.uid,
                name: profileName,
                email,
                role,
                gender,
                isAdmin: email === "aniltimilsena53@gmail.com",
                createdAt: now,
                updatedAt: now,
            });
        }
        else {
            transaction.set(userRef, {
                name: profileName,
                role,
                gender,
                updatedAt: now,
                isAdmin: email === "aniltimilsena53@gmail.com" ? true : userSnap.data()?.isAdmin ?? false,
            }, { merge: true });
        }
        transaction.set(profileRef, {
            uid: auth.uid,
            name: profileName,
            role,
            gender,
            bio: "",
            location: "",
            skills: [],
            experience: [],
            languages: [],
            media: [],
            verified: false,
            updatedAt: now,
        }, { merge: true });
    });
    if (email === "aniltimilsena53@gmail.com") {
        try {
            await (0, auth_1.getAuth)().setCustomUserClaims(auth.uid, { admin: true });
        }
        catch (claimErr) {
            logger.error("Failed to set bootstrap custom claim:", claimErr);
        }
    }
    await logSecurityEvent("user.bootstrap", "info", auth.uid, { hasEmail: !!email });
    return { success: true };
});
exports.upsertProfile = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = ProfileUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid profile update payload");
    }
    await enforceRateLimit(auth.uid, "upsertProfile", 30, 60);
    await db.collection("profiles").doc(auth.uid).set({
        ...parsed.data,
        uid: auth.uid,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await logSecurityEvent("profile.update", "info", auth.uid, { keys: Object.keys(parsed.data) });
    return { success: true };
});
exports.createOrGetConversation = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = ConversationSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid conversation payload");
    }
    await enforceRateLimit(auth.uid, "createOrGetConversation", 30, 60);
    const uniqueParticipants = Array.from(new Set(parsed.data.participants));
    if (!uniqueParticipants.includes(auth.uid)) {
        throw new https_1.HttpsError("permission-denied", "Conversation must include authenticated user");
    }
    if (uniqueParticipants.length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Conversation requires at least two participants");
    }
    const sorted = uniqueParticipants.slice().sort();
    const snapshot = await db.collection("conversations").where("participants", "array-contains", auth.uid).get();
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
    const convoRef = await db.collection("conversations").add({
        participants: sorted,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        lastMessage: "",
        lastMessageAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await logSecurityEvent("conversation.create", "info", auth.uid, { conversationId: convoRef.id, participantCount: sorted.length });
    return { id: convoRef.id, created: true };
});
exports.deleteConversation = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = zod_1.z.object({ conversationId: zod_1.z.string().min(1) }).safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid delete conversation payload");
    }
    await enforceRateLimit(auth.uid, "deleteConversation", 10, 60);
    const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
    await convoRef.delete();
    await logSecurityEvent("conversation.delete", "warning", auth.uid, { conversationId: parsed.data.conversationId });
    return { success: true };
});
exports.sendMessage = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const auth = assertAuth(request.auth);
        const parsed = MessageSendSchema.safeParse(request.data);
        if (!parsed.success) {
            logger.error("SendMessage: Invalid payload", { errors: parsed.error.format() });
            throw new https_1.HttpsError("invalid-argument", "Invalid message payload");
        }
        await enforceRateLimit(auth.uid, "sendMessage", 60, 60);
        const { convoRef, participants } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
        const message = {
            senderId: auth.uid,
            text: parsed.data.text,
            isSystem: parsed.data.isSystem,
            type: parsed.data.type,
            replyTo: parsed.data.replyTo ?? null,
            reactions: {},
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await convoRef.collection("messages").add(message);
        await convoRef.set({
            lastMessage: parsed.data.text,
            lastMessageAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            unread: true,
        }, { merge: true });
        await logSecurityEvent("message.send", "info", auth.uid, {
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
            // SECURITY FIX: Do not log user input (request.data) in production
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Message sending failed");
    }
});
exports.updateMessage = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = MessageUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message update payload");
    }
    await enforceRateLimit(auth.uid, "updateMessage", 30, 60);
    const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
        throw new https_1.HttpsError("not-found", "Message not found");
    }
    if (messageSnap.data()?.senderId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only message sender can edit this message");
    }
    await messageRef.set({
        text: parsed.data.text,
        isEdited: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await logSecurityEvent("message.update", "info", auth.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
    });
    return { success: true };
});
exports.deleteMessage = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = MessageDeleteSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message delete payload");
    }
    await enforceRateLimit(auth.uid, "deleteMessage", 20, 60);
    const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
        throw new https_1.HttpsError("not-found", "Message not found");
    }
    if (messageSnap.data()?.senderId !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only message sender can delete this message");
    }
    await messageRef.delete();
    await logSecurityEvent("message.delete", "warning", auth.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
    });
    return { success: true };
});
exports.reactToMessage = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = MessageReactionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid message reaction payload");
    }
    await enforceRateLimit(auth.uid, "reactToMessage", 60, 60);
    const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
    const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
    await db.runTransaction(async (transaction) => {
        const messageSnap = await transaction.get(messageRef);
        if (!messageSnap.exists) {
            throw new https_1.HttpsError("not-found", "Message not found");
        }
        const messageData = messageSnap.data();
        const reactions = { ...(messageData.reactions ?? {}) };
        Object.keys(reactions).forEach((emojiKey) => {
            reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id) => id !== auth.uid);
            if (reactions[emojiKey].length === 0) {
                delete reactions[emojiKey];
            }
        });
        reactions[parsed.data.emoji] = [...(reactions[parsed.data.emoji] ?? []), auth.uid];
        transaction.set(messageRef, {
            reactions,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    await logSecurityEvent("message.react", "info", auth.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
        emoji: parsed.data.emoji,
    });
    return { success: true };
});
exports.pinMessage = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = MessagePinSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid pin payload");
    }
    await enforceRateLimit(auth.uid, "pinMessage", 30, 60);
    const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
    await convoRef.collection("messages").doc(parsed.data.messageId).set({
        isPinned: parsed.data.pinned,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await logSecurityEvent("message.pin", "info", auth.uid, {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId,
        pinned: parsed.data.pinned,
    });
    return { success: true };
});
exports.blockUser = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = BlockUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid block user payload");
    }
    if (parsed.data.targetId === auth.uid) {
        throw new https_1.HttpsError("invalid-argument", "Cannot block yourself");
    }
    await enforceRateLimit(auth.uid, "blockUser", 30, 60);
    await db.collection("users").doc(auth.uid).set({
        blockedUsers: firestore_1.FieldValue.arrayUnion(parsed.data.targetId),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await logSecurityEvent("user.block", "warning", auth.uid, { targetId: parsed.data.targetId });
    return { success: true };
});
exports.registerNotificationToken = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    const parsed = NotificationTokenSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid notification token payload");
    }
    await enforceRateLimit(auth.uid, "registerNotificationToken", 20, 300);
    const privateSettingsRef = db.collection("users").doc(auth.uid).collection("private").doc("settings");
    await db.runTransaction(async (transaction) => {
        const settingsSnapshot = await transaction.get(privateSettingsRef);
        const existingRaw = settingsSnapshot.data()?.fcmTokens;
        const existingTokens = Array.isArray(existingRaw)
            ? existingRaw.filter((item) => typeof item === "string")
            : [];
        if (existingTokens.includes(parsed.data.token)) {
            return;
        }
        if (existingTokens.length >= MAX_FCM_TOKENS) {
            throw new https_1.HttpsError("resource-exhausted", `FCM token limit reached (${MAX_FCM_TOKENS})`);
        }
        transaction.set(privateSettingsRef, {
            fcmTokens: firestore_1.FieldValue.arrayUnion(parsed.data.token),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    await logSecurityEvent("notifications.token.register", "info", auth.uid, {});
    return { success: true };
});
exports.adminCreateCastingCall = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    await assertAdmin(auth);
    const parsed = AdminCastingSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call payload");
    }
    await enforceRateLimit(auth.uid, "adminCreateCastingCall", 30, 60);
    const payload = {
        ...parsed.data,
        status: "Open",
        createdBy: auth.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("casting_calls").add(payload);
    await logSecurityEvent("casting.admin.create", "info", auth.uid, { castingCallId: docRef.id });
    return { id: docRef.id, success: true };
});
exports.adminUpdateCastingCall = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    await assertAdmin(auth);
    const parsed = AdminCastingUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call update payload");
    }
    await enforceRateLimit(auth.uid, "adminUpdateCastingCall", 40, 60);
    const { id, ...rest } = parsed.data;
    await db.collection("casting_calls").doc(id).set({
        ...rest,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
    }, { merge: true });
    await logSecurityEvent("casting.admin.update", "warning", auth.uid, { castingCallId: id, changedKeys: Object.keys(rest) });
    return { success: true };
});
exports.adminDeleteCastingCall = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    await assertAdmin(auth);
    const parsed = AdminCastingDeleteSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call delete payload");
    }
    await enforceRateLimit(auth.uid, "adminDeleteCastingCall", 20, 60);
    await db.collection("casting_calls").doc(parsed.data.id).delete();
    await logSecurityEvent("casting.admin.delete", "critical", auth.uid, { castingCallId: parsed.data.id });
    return { success: true };
});
exports.adminSetCastingPriority = (0, https_1.onCall)(callableOptions, async (request) => {
    const auth = assertAuth(request.auth);
    await assertAdmin(auth);
    const parsed = AdminCastingPrioritySchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting priority payload");
    }
    await enforceRateLimit(auth.uid, "adminSetCastingPriority", 60, 60);
    await db.collection("casting_calls").doc(parsed.data.id).set({
        highPriority: parsed.data.highPriority,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
    }, { merge: true });
    await logSecurityEvent("casting.admin.priority", "warning", auth.uid, {
        castingCallId: parsed.data.id,
        highPriority: parsed.data.highPriority,
    });
    return { success: true };
});
exports.onMessageCreated = (0, firestore_2.onDocumentCreated)({
    document: "conversations/{convoId}/messages/{messageId}",
    region: DEFAULT_REGION,
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
    // Skip system messages
    if (messageData.isSystem || messageData.senderId === "system") {
        return;
    }
    const convoId = event.params.convoId;
    const senderId = messageData.senderId;
    const text = messageData.text || "";
    const type = messageData.type || "text";
    try {
        // 1. Get conversation participants
        const convoRef = db.collection("conversations").doc(convoId);
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
        // 2. Fetch sender profile to get their name
        let senderName = "Someone";
        try {
            const senderSnap = await db.collection("profiles").doc(senderId).get();
            if (senderSnap.exists) {
                const sData = senderSnap.data();
                senderName = sData?.name || [sData?.firstName, sData?.lastName].filter(Boolean).join(" ") || sData?.username || senderName;
            }
        }
        catch (e) {
            logger.error("Error fetching sender profile:", e);
        }
        // 3. Format message preview
        let preview = text;
        if (type === "image") {
            preview = "📷 Sent a photo";
        }
        else if (type === "video") {
            preview = "🎥 Sent a video";
        }
        // 4. Send OneSignal push notification
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
exports.checkExpiredBans = (0, scheduler_1.onSchedule)({
    schedule: "every 24 hours",
    region: DEFAULT_REGION,
    maxInstances: 5,
}, async (event) => {
    const now = firestore_1.Timestamp.now();
    const expiredBans = await db
        .collection("users")
        .where("status", "==", "banned")
        .where("banExpiresAt", "<=", now)
        .get();
    if (expiredBans.empty) {
        logger.info("No expired bans found.");
        return;
    }
    const batch = db.batch();
    const auth = (0, auth_1.getAuth)();
    for (const doc of expiredBans.docs) {
        try {
            // Re-enable Firebase Auth account
            await auth.updateUser(doc.id, { disabled: false });
            // Update Firestore status in users collection
            batch.update(doc.ref, {
                status: 'Active',
                bannedAt: firestore_1.FieldValue.delete(),
                bannedBy: firestore_1.FieldValue.delete(),
                banReason: firestore_1.FieldValue.delete(),
                banExpiresAt: firestore_1.FieldValue.delete(),
            });
            // Update Firestore status in profiles collection
            const profileRef = db.collection("profiles").doc(doc.id);
            batch.update(profileRef, {
                status: 'Active',
                bannedAt: firestore_1.FieldValue.delete(),
                bannedBy: firestore_1.FieldValue.delete(),
                banReason: firestore_1.FieldValue.delete(),
                banExpiresAt: firestore_1.FieldValue.delete(),
            });
        }
        catch (err) {
            logger.error(`Failed to unban user ${doc.id}:`, err);
        }
    }
    await batch.commit();
    logger.info(`Auto-unbanned ${expiredBans.size} users`);
});
// Admin Moderation: Delete User
exports.adminDeleteUser = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminUserActionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user delete payload");
    }
    const { userId } = parsed.data;
    await enforceRateLimit(authCtx.uid, "adminDeleteUser", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        try {
            await auth.revokeRefreshTokens(userId);
        }
        catch { }
        try {
            await auth.deleteUser(userId);
        }
        catch { }
        const sessionsSnap = await db.collection("profiles").doc(userId).collection("sessions").get();
        const batch = db.batch();
        sessionsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        batch.delete(db.collection("users").doc(userId));
        batch.delete(db.collection("profiles").doc(userId));
        await batch.commit();
        await logSecurityEvent("user.admin.delete", "critical", authCtx.uid, { deletedUserId: userId });
        await db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Delete User Account",
            targetId: userId,
            details: { deletedByAdminUid: authCtx.uid },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to delete user");
    }
});
// Admin Moderation: Ban User
exports.adminBanUser = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminBanUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user ban payload");
    }
    const { userId, reason, duration } = parsed.data;
    await enforceRateLimit(authCtx.uid, "adminBanUser", 10, 60);
    let banExpiresAt = null;
    if (duration && duration !== "permanent") {
        const match = duration.match(/^(\d+)([d])$/);
        if (match) {
            const days = parseInt(match[1], 10);
            banExpiresAt = firestore_1.Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
        }
    }
    const auth = (0, auth_1.getAuth)();
    try {
        await auth.updateUser(userId, { disabled: true });
        await auth.revokeRefreshTokens(userId);
        const updatePayload = {
            status: "banned",
            bannedAt: firestore_1.FieldValue.serverTimestamp(),
            bannedBy: authCtx.uid,
            banReason: reason || "No reason provided",
        };
        if (banExpiresAt) {
            updatePayload.banExpiresAt = banExpiresAt;
        }
        const batch = db.batch();
        batch.update(db.collection("users").doc(userId), updatePayload);
        batch.update(db.collection("profiles").doc(userId), updatePayload);
        await batch.commit();
        await logSecurityEvent("user.admin.ban", "warning", authCtx.uid, { bannedUserId: userId, reason, duration });
        await db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Ban User Account",
            targetId: userId,
            details: { bannedByAdminUid: authCtx.uid, reason, duration },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to ban user");
    }
});
// Admin Moderation: Unban User
exports.adminUnbanUser = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminUserActionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user unban payload");
    }
    const { userId } = parsed.data;
    await enforceRateLimit(authCtx.uid, "adminUnbanUser", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        await auth.updateUser(userId, { disabled: false });
        const batch = db.batch();
        const updatePayload = {
            status: "Active",
            bannedAt: firestore_1.FieldValue.delete(),
            bannedBy: firestore_1.FieldValue.delete(),
            banReason: firestore_1.FieldValue.delete(),
            banExpiresAt: firestore_1.FieldValue.delete(),
        };
        batch.update(db.collection("users").doc(userId), updatePayload);
        batch.update(db.collection("profiles").doc(userId), updatePayload);
        await batch.commit();
        await logSecurityEvent("user.admin.unban", "info", authCtx.uid, { unbannedUserId: userId });
        await db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Unban User Account",
            targetId: userId,
            details: { unbannedByAdminUid: authCtx.uid },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to unban user");
    }
});
// Admin Moderation: Update User Role (with Custom Claims promotion)
exports.adminUpdateUserRole = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminUpdateUserRoleSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user role update payload");
    }
    const { userId, makeAdmin } = parsed.data;
    if (userId === authCtx.uid) {
        throw new https_1.HttpsError("invalid-argument", "Cannot modify your own admin status");
    }
    await enforceRateLimit(authCtx.uid, "adminUpdateUserRole", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        const nextRole = makeAdmin ? "Admin" : "Talent";
        const batch = db.batch();
        batch.update(db.collection("users").doc(userId), { isAdmin: makeAdmin, role: nextRole });
        batch.update(db.collection("profiles").doc(userId), { isAdmin: makeAdmin, role: nextRole });
        await batch.commit();
        await auth.setCustomUserClaims(userId, { admin: makeAdmin });
        await logSecurityEvent("user.admin.roleUpdate", "warning", authCtx.uid, { targetUserId: userId, makeAdmin });
        await db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Update User Role",
            targetId: userId,
            details: { updatedByAdminUid: authCtx.uid, makeAdmin, role: nextRole },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true, role: nextRole, isAdmin: makeAdmin };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to update user role");
    }
});
// Admin Moderation: Approve Data Export Request
exports.adminApproveDataRequest = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminDataRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid data request payload");
    }
    const { requestId } = parsed.data;
    await enforceRateLimit(authCtx.uid, "adminApproveDataRequest", 10, 60);
    try {
        const requestRef = db.collection("data_requests").doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) {
            throw new https_1.HttpsError("not-found", "Request not found");
        }
        const requestData = requestDoc.data();
        if (requestData?.status !== "pending") {
            throw new https_1.HttpsError("failed-precondition", "Request is not pending");
        }
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await db.collection("one_time_tokens").doc(token).set({
            uid: requestData.userId,
            requestId: requestId,
            expiresAt: expiresAt,
            createdAt: Date.now(),
        });
        const downloadLink = `${process.env.APP_URL || "https://nc-netwotk.vercel.app"}/api/data-export/download?token=${token}`;
        await requestRef.update({
            status: "approved",
            approvedAt: firestore_1.FieldValue.serverTimestamp(),
            approvedBy: authCtx.uid,
            downloadLink: downloadLink,
            expiresAt: firestore_1.Timestamp.fromMillis(expiresAt),
        });
        await logSecurityEvent("dataRequest.admin.approve", "info", authCtx.uid, { requestId, targetUserId: requestData.userId });
        return { success: true, downloadLink };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError("internal", err.message || "Failed to approve data request");
    }
});
// Admin Moderation: Reject Data Export Request
exports.adminRejectDataRequest = (0, https_1.onCall)(callableOptions, async (request) => {
    const authCtx = assertAuth(request.auth);
    await assertAdmin(authCtx);
    const parsed = AdminDataRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid data request payload");
    }
    const { requestId, reason } = parsed.data;
    if (!reason || reason.trim().length < 5) {
        throw new https_1.HttpsError("invalid-argument", "Please enter a rejection reason (minimum 5 characters)");
    }
    await enforceRateLimit(authCtx.uid, "adminRejectDataRequest", 10, 60);
    try {
        const requestRef = db.collection("data_requests").doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) {
            throw new https_1.HttpsError("not-found", "Request not found");
        }
        const requestData = requestDoc.data();
        if (requestData?.status !== "pending") {
            throw new https_1.HttpsError("failed-precondition", "Request is not pending");
        }
        await requestRef.update({
            status: "rejected",
            rejectedAt: firestore_1.FieldValue.serverTimestamp(),
            rejectedBy: authCtx.uid,
            rejectionReason: reason,
        });
        await logSecurityEvent("dataRequest.admin.reject", "info", authCtx.uid, { requestId, reason, targetUserId: requestData.userId });
        return { success: true };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError("internal", err.message || "Failed to reject data request");
    }
});
//# sourceMappingURL=index.js.map