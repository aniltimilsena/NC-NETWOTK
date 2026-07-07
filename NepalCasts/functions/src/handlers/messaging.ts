import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { callableOptions, db, DEFAULT_REGION } from "../config";
import { assertAuth, assertConversationParticipant } from "../lib/validation";
import { enforceRateLimit, logSecurityEvent } from "../lib/rateLimit";
import {
  ConversationSchema,
  MessageSendSchema,
  MessageUpdateSchema,
  MessageDeleteSchema,
  MessageReactionSchema,
  MessagePinSchema,
  BlockUserSchema
} from "../schemas";

export const createOrGetConversation = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = ConversationSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid conversation payload");
  }

  await enforceRateLimit(authCtx.uid, "createOrGetConversation", 30, 60);

  const uniqueParticipants = Array.from(new Set(parsed.data.participants));
  if (!uniqueParticipants.includes(authCtx.uid)) {
    throw new HttpsError("permission-denied", "Conversation must include authenticated user");
  }
  if (uniqueParticipants.length < 2) {
    throw new HttpsError("invalid-argument", "Conversation requires at least two participants");
  }

  const sorted = uniqueParticipants.slice().sort();
  const snapshot = await db.collection("conversations").where("participants", "array-contains", authCtx.uid).get();
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

  await logSecurityEvent("conversation.create", "info", authCtx.uid, { conversationId: convoRef.id, participantCount: sorted.length });
  return { id: convoRef.id, created: true };
});

export const deleteConversation = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = z.object({ conversationId: z.string().min(1) }).safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid delete conversation payload");
  }

  await enforceRateLimit(authCtx.uid, "deleteConversation", 10, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);
  await convoRef.delete();
  await logSecurityEvent("conversation.delete", "warning", authCtx.uid, { conversationId: parsed.data.conversationId });
  return { success: true };
});

export const sendMessage = onCall(callableOptions, async (request) => {
  try {
    const authCtx = assertAuth(request.auth);
    const parsed = MessageSendSchema.safeParse(request.data);
    if (!parsed.success) {
      logger.error("SendMessage: Invalid payload", { errors: parsed.error.format() });
      throw new HttpsError("invalid-argument", "Invalid message payload");
    }

    await enforceRateLimit(authCtx.uid, "sendMessage", 60, 60);
    const { convoRef, participants } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);

    const message = {
      senderId: authCtx.uid,
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

    await logSecurityEvent("message.send", "info", authCtx.uid, {
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
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Message sending failed");
  }
});

export const updateMessage = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = MessageUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message update payload");
  }

  await enforceRateLimit(authCtx.uid, "updateMessage", 30, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new HttpsError("not-found", "Message not found");
  }
  if (messageSnap.data()?.senderId !== authCtx.uid) {
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

  await logSecurityEvent("message.update", "info", authCtx.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
  });
  return { success: true };
});

export const deleteMessage = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = MessageDeleteSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message delete payload");
  }

  await enforceRateLimit(authCtx.uid, "deleteMessage", 20, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    throw new HttpsError("not-found", "Message not found");
  }
  if (messageSnap.data()?.senderId !== authCtx.uid) {
    throw new HttpsError("permission-denied", "Only message sender can delete this message");
  }

  await messageRef.delete();
  await logSecurityEvent("message.delete", "warning", authCtx.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
  });
  return { success: true };
});

export const reactToMessage = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = MessageReactionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid message reaction payload");
  }

  await enforceRateLimit(authCtx.uid, "reactToMessage", 60, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);
  const messageRef = convoRef.collection("messages").doc(parsed.data.messageId);

  await db.runTransaction(async (transaction) => {
    const messageSnap = await transaction.get(messageRef);
    if (!messageSnap.exists) {
      throw new HttpsError("not-found", "Message not found");
    }
    const messageData = messageSnap.data() as { reactions?: Record<string, string[]> };
    const reactions = { ...(messageData.reactions ?? {}) };

    Object.keys(reactions).forEach((emojiKey) => {
      reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id) => id !== authCtx.uid);
      if (reactions[emojiKey].length === 0) {
        delete reactions[emojiKey];
      }
    });

    reactions[parsed.data.emoji] = [...(reactions[parsed.data.emoji] ?? []), authCtx.uid];

    transaction.set(
      messageRef,
      {
        reactions,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await logSecurityEvent("message.react", "info", authCtx.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
    emoji: parsed.data.emoji,
  });
  return { success: true };
});

export const pinMessage = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = MessagePinSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid pin payload");
  }

  await enforceRateLimit(authCtx.uid, "pinMessage", 30, 60);
  const { convoRef } = await assertConversationParticipant(parsed.data.conversationId, authCtx.uid);
  await convoRef.collection("messages").doc(parsed.data.messageId).set(
    {
      isPinned: parsed.data.pinned,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await logSecurityEvent("message.pin", "info", authCtx.uid, {
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId,
    pinned: parsed.data.pinned,
  });
  return { success: true };
});

export const blockUser = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = BlockUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid block user payload");
  }
  if (parsed.data.targetId === authCtx.uid) {
    throw new HttpsError("invalid-argument", "Cannot block yourself");
  }

  await enforceRateLimit(authCtx.uid, "blockUser", 30, 60);
  await db.collection("users").doc(authCtx.uid).set(
    {
      blockedUsers: FieldValue.arrayUnion(parsed.data.targetId),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await logSecurityEvent("user.block", "warning", authCtx.uid, { targetId: parsed.data.targetId });
  return { success: true };
});

export const unblockUser = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = BlockUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid unblock user payload");
  }

  await enforceRateLimit(authCtx.uid, "unblockUser", 30, 60);
  await db.collection("users").doc(authCtx.uid).set(
    {
      blockedUsers: FieldValue.arrayRemove(parsed.data.targetId),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await logSecurityEvent("user.unblock", "info", authCtx.uid, { targetId: parsed.data.targetId });
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

    if (messageData.isSystem || messageData.senderId === "system") {
      return;
    }

    const convoId = event.params.convoId;
    const senderId = messageData.senderId;
    const text = messageData.text || "";
    const type = messageData.type || "text";

    try {
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

      let preview = text;
      if (type === "image") {
        preview = "📷 Sent a photo";
      } else if (type === "video") {
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
