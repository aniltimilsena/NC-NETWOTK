import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { z } from "zod";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const MAX_FCM_TOKENS = 20;
const DEFAULT_REGION = process.env.FUNCTIONS_REGION ?? "us-central1";
const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";

const callableOptions = {
  region: DEFAULT_REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  maxInstances: 20,
};

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  username: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
  gender: z.string().max(30).optional(),
  bio: z.string().max(500).optional(),
  role: z.string().max(60).optional(),
  location: z.string().max(120).optional(),
  languages: z.array(z.string().max(60)).max(20).optional(),
  skills: z.array(z.union([z.string().max(80), z.record(z.string(), z.unknown())])).max(50).optional(),
  experience: z.array(z.unknown()).max(50).optional(),
  openToWork: z.boolean().optional(),
  height: z.string().max(20).optional().nullable(),
  weight: z.string().max(20).optional().nullable(),
  eyeColor: z.string().max(40).optional(),
  hairColor: z.string().max(40).optional(),
  image: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  email: z.string().email().optional(),
  media: z.array(z.string().url()).max(20).optional(),
});

const BootstrapUserSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(60).optional(),
  gender: z.string().max(30).optional(),
  email: z.string().email().optional(),
});

const ConversationSchema = z.object({
  participants: z.array(z.string().min(1)).min(2).max(10),
});

const MessageSendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(2000),
  type: z.enum(["text", "image", "file"]).optional().default("text"),
  isSystem: z.boolean().optional().default(false),
  replyTo: z
    .object({
      id: z.string().min(1),
      text: z.string().max(2000),
      senderId: z.string().min(1),
    })
    .optional(),
});

const MessageUpdateSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

const MessageDeleteSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

const MessageReactionSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(16),
});

const MessagePinSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  pinned: z.boolean(),
});

const NotificationTokenSchema = z.object({
  token: z.string().min(50).max(4096),
});

const BlockUserSchema = z.object({
  targetId: z.string().min(1),
});

const AdminCastingSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().min(20).max(5000),
  type: z.enum(["Film", "Commercial", "Web Series", "Theatre"]),
  budget: z.string().max(120).optional(),
  location: z.string().min(2).max(120),
  highPriority: z.boolean().optional().default(false),
});

const AdminCastingUpdateSchema = AdminCastingSchema.partial().extend({
  id: z.string().min(1),
});

const AdminCastingDeleteSchema = z.object({
  id: z.string().min(1),
});

const AdminCastingPrioritySchema = z.object({
  id: z.string().min(1),
  highPriority: z.boolean(),
});

type AuthContext = { uid: string; token: Record<string, unknown> };

const assertAuth = (auth: { uid?: string; token?: Record<string, unknown> } | null): AuthContext => {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return { uid: auth.uid, token: auth.token ?? {} };
};

const enforceRateLimit = async (
  uid: string,
  action: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<void> => {
  const nowMs = Date.now();
  const windowStartMs = nowMs - windowSeconds * 1000;
  const rateRef = db.collection("securityRateLimits").doc(`${action}:${uid}`);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateRef);
    const data = snap.data() as { count?: number; firstRequestAt?: Timestamp } | undefined;
    const firstRequestAtMs = data?.firstRequestAt?.toMillis?.() ?? nowMs;
    const isWindowExpired = firstRequestAtMs < windowStartMs;

    const nextCount = isWindowExpired ? 1 : (data?.count ?? 0) + 1;
    if (nextCount > maxRequests) {
      throw new HttpsError("resource-exhausted", `Rate limit exceeded for action ${action}`);
    }

    transaction.set(
      rateRef,
      {
        action,
        uid,
        count: nextCount,
        firstRequestAt: isWindowExpired ? Timestamp.fromMillis(nowMs) : data?.firstRequestAt ?? Timestamp.fromMillis(nowMs),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
};

const logSecurityEvent = async (
  eventType: string,
  severity: "info" | "warning" | "critical",
  uid: string,
  details: Record<string, unknown>,
): Promise<void> => {
  logger.log("security_event", { eventType, severity, uid, ...details });
  await db.collection("securityEvents").add({
    eventType,
    severity,
    uid,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
};

const assertConversationParticipant = async (conversationId: string, uid: string) => {
  const convoRef = db.collection("conversations").doc(conversationId);
  const convoSnap = await convoRef.get();
  if (!convoSnap.exists) {
    throw new HttpsError("not-found", "Conversation not found");
  }
  const participants = convoSnap.data()?.participants;
  if (!Array.isArray(participants) || !participants.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a participant of this conversation");
  }
  return { convoRef, participants: participants as string[] };
};

const assertAdmin = async (auth: AuthContext): Promise<void> => {
  if (auth.token.admin === true) {
    return;
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (userDoc.exists && userDoc.data()?.isAdmin === true) {
    return;
  }
  throw new HttpsError("permission-denied", "Admin role required");
};

export const bootstrapUserProfile = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = BootstrapUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user profile payload");
  }

  await enforceRateLimit(auth.uid, "bootstrapUserProfile", 5, 60);

  const now = FieldValue.serverTimestamp();
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
    } else {
      transaction.set(
        userRef,
        {
          name: profileName,
          role,
          gender,
          updatedAt: now,
          isAdmin: email === "aniltimilsena53@gmail.com" ? true : userSnap.data()?.isAdmin ?? false,
        },
        { merge: true }
      );
    }

    transaction.set(
      profileRef,
      {
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
      },
      { merge: true },
    );
  });

  await logSecurityEvent("user.bootstrap", "info", auth.uid, { hasEmail: !!email });
  return { success: true };
});

export const upsertProfile = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = ProfileUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid profile update payload");
  }

  await enforceRateLimit(auth.uid, "upsertProfile", 30, 60);

  await db.collection("profiles").doc(auth.uid).set(
    {
      ...parsed.data,
      uid: auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await logSecurityEvent("profile.update", "info", auth.uid, { keys: Object.keys(parsed.data) });
  return { success: true };
});

export const createOrGetConversation = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = ConversationSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid conversation payload");
  }

  await enforceRateLimit(auth.uid, "createOrGetConversation", 30, 60);

  const uniqueParticipants = Array.from(new Set(parsed.data.participants));
  if (!uniqueParticipants.includes(auth.uid)) {
    throw new HttpsError("permission-denied", "Conversation must include authenticated user");
  }
  if (uniqueParticipants.length < 2) {
    throw new HttpsError("invalid-argument", "Conversation requires at least two participants");
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessage: "",
    lastMessageAt: FieldValue.serverTimestamp(),
  });

  await logSecurityEvent("conversation.create", "info", auth.uid, { conversationId: convoRef.id, participantCount: sorted.length });
  return { id: convoRef.id, created: true };
});

export const deleteConversation = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = z.object({ conversationId: z.string().min(1) }).safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid delete conversation payload");
  }

  await enforceRateLimit(auth.uid, "deleteConversation", 10, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
  await convoRef.delete();
  await logSecurityEvent("conversation.delete", "warning", auth.uid, { conversationId: parsed.data.conversationId });
  return { success: true };
});

export const sendMessage = onCall(callableOptions, async (request) => {
  try {
    const auth = assertAuth(request.auth);
    const parsed = MessageSendSchema.safeParse(request.data);
    if (!parsed.success) {
      logger.error("SendMessage: Invalid payload", { errors: parsed.error.format() });
      throw new HttpsError("invalid-argument", "Invalid message payload");
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
      createdAt: FieldValue.serverTimestamp(),
    };

    await convoRef.collection("messages").add(message);
    await convoRef.set(
      {
        lastMessage: parsed.data.text,
        lastMessageAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        unread: true,
      },
      { merge: true },
    );

    await logSecurityEvent("message.send", "info", auth.uid, {
      conversationId: parsed.data.conversationId,
      participantCount: participants.length,
      type: parsed.data.type,
      isSystem: parsed.data.isSystem,
    });
    return { success: true };
  } catch (error: any) {
    logger.error("SendMessage: Internal Error", { 
      message: error.message, 
      code: error.code,
      stack: error.stack,
      data: request.data
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Message sending failed");
  }
});

export const updateMessage = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = MessageUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message update payload");
  }

  await enforceRateLimit(auth.uid, "updateMessage", 30, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new HttpsError("not-found", "Message not found");
  }
  if (messageSnap.data()?.senderId !== auth.uid) {
    throw new HttpsError("permission-denied", "Only message sender can edit this message");
  }

  await messageRef.set(
    {
      text: parsed.data.text,
      isEdited: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await logSecurityEvent("message.update", "info", auth.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
  });
  return { success: true };
});

export const deleteMessage = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = MessageDeleteSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message delete payload");
  }

  await enforceRateLimit(auth.uid, "deleteMessage", 20, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new HttpsError("not-found", "Message not found");
  }
  if (messageSnap.data()?.senderId !== auth.uid) {
    throw new HttpsError("permission-denied", "Only message sender can delete this message");
  }

  await messageRef.delete();
  await logSecurityEvent("message.delete", "warning", auth.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
  });
  return { success: true };
});

export const reactToMessage = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = MessageReactionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message reaction payload");
  }

  await enforceRateLimit(auth.uid, "reactToMessage", 60, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);

  await db.runTransaction(async (transaction) => {
    const messageSnap = await transaction.get(messageRef);
    if (!messageSnap.exists) {
      throw new HttpsError("not-found", "Message not found");
    }
    const messageData = messageSnap.data() as { reactions?: Record<string, string[]> };
    const reactions = { ...(messageData.reactions ?? {}) };

    Object.keys(reactions).forEach((emojiKey) => {
      reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id) => id !== auth.uid);
      if (reactions[emojiKey].length === 0) {
        delete reactions[emojiKey];
      }
    });

    reactions[parsed.data.emoji] = [...(reactions[parsed.data.emoji] ?? []), auth.uid];

    transaction.set(
      messageRef,
      {
        reactions,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await logSecurityEvent("message.react", "info", auth.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
    emoji: parsed.data.emoji,
  });
  return { success: true };
});

export const pinMessage = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = MessagePinSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid pin payload");
  }

  await enforceRateLimit(auth.uid, "pinMessage", 30, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, auth.uid);
  await convoRef.collection("messages").doc(parsed.data.messageId).set(
    {
      isPinned: parsed.data.pinned,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await logSecurityEvent("message.pin", "info", auth.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
    pinned: parsed.data.pinned,
  });
  return { success: true };
});

export const blockUser = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = BlockUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid block user payload");
  }
  if (parsed.data.targetId === auth.uid) {
    throw new HttpsError("invalid-argument", "Cannot block yourself");
  }

  await enforceRateLimit(auth.uid, "blockUser", 30, 60);
  await db.collection("users").doc(auth.uid).set(
    {
      blockedUsers: FieldValue.arrayUnion(parsed.data.targetId),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await logSecurityEvent("user.block", "warning", auth.uid, { targetId: parsed.data.targetId });
  return { success: true };
});

export const registerNotificationToken = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  const parsed = NotificationTokenSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid notification token payload");
  }

  await enforceRateLimit(auth.uid, "registerNotificationToken", 20, 300);

  const userRef = db.collection("users").doc(auth.uid);
  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const existingRaw = userSnapshot.data()?.fcmTokens;
    const existingTokens = Array.isArray(existingRaw)
      ? existingRaw.filter((item): item is string => typeof item === "string")
      : [];

    if (existingTokens.includes(parsed.data.token)) {
      return;
    }
    if (existingTokens.length >= MAX_FCM_TOKENS) {
      throw new HttpsError("resource-exhausted", `FCM token limit reached (${MAX_FCM_TOKENS})`);
    }

    transaction.set(
      userRef,
      {
        fcmTokens: FieldValue.arrayUnion(parsed.data.token),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await logSecurityEvent("notifications.token.register", "info", auth.uid, {});
  return { success: true };
});

export const adminCreateCastingCall = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const parsed = AdminCastingSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call payload");
  }

  await enforceRateLimit(auth.uid, "adminCreateCastingCall", 30, 60);
  const payload = {
    ...parsed.data,
    status: "Open",
    createdBy: auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const docRef = await db.collection("casting_calls").add(payload);

  await logSecurityEvent("casting.admin.create", "info", auth.uid, { castingCallId: docRef.id });
  return { id: docRef.id, success: true };
});

export const adminUpdateCastingCall = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const parsed = AdminCastingUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call update payload");
  }

  await enforceRateLimit(auth.uid, "adminUpdateCastingCall", 40, 60);
  const { id, ...rest } = parsed.data;
  await db.collection("casting_calls").doc(id).set(
    {
      ...rest,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    { merge: true },
  );

  await logSecurityEvent("casting.admin.update", "warning", auth.uid, { castingCallId: id, changedKeys: Object.keys(rest) });
  return { success: true };
});

export const adminDeleteCastingCall = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const parsed = AdminCastingDeleteSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call delete payload");
  }

  await enforceRateLimit(auth.uid, "adminDeleteCastingCall", 20, 60);
  await db.collection("casting_calls").doc(parsed.data.id).delete();
  await logSecurityEvent("casting.admin.delete", "critical", auth.uid, { castingCallId: parsed.data.id });
  return { success: true };
});

export const adminSetCastingPriority = onCall(callableOptions, async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const parsed = AdminCastingPrioritySchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting priority payload");
  }

  await enforceRateLimit(auth.uid, "adminSetCastingPriority", 60, 60);
  await db.collection("casting_calls").doc(parsed.data.id).set(
    {
      highPriority: parsed.data.highPriority,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    { merge: true },
  );
  await logSecurityEvent("casting.admin.priority", "warning", auth.uid, {
    castingCallId: parsed.data.id,
    highPriority: parsed.data.highPriority,
  });
  return { success: true };
});

export const onMessageCreated = onDocumentCreated(
  {
    document: "conversations/{convoId}/messages/{messageId}",
    region: DEFAULT_REGION,
    maxInstances: 10,
  },
  async (event) => {
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
      } catch (e) {
        logger.error("Error fetching sender profile:", e);
      }

      // 3. Format message preview
      let preview = text;
      if (type === "image") {
        preview = "📷 Sent a photo";
      } else if (type === "video") {
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

      const data = await response.json() as any;
      if (!response.ok) {
        logger.error("❌ OneSignal Notification failed:", data);
      } else {
        logger.info("🚀 OneSignal Notification sent successfully:", data);
      }
    } catch (err) {
      logger.error("Error processing onMessageCreated trigger:", err);
    }
  }
);
