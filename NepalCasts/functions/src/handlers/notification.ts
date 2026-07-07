import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { callableOptions, db, MAX_FCM_TOKENS } from "../config";
import { assertAuth } from "../lib/validation";
import { enforceRateLimit, logSecurityEvent } from "../lib/rateLimit";
import { NotificationTokenSchema } from "../schemas";

export const registerNotificationToken = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = NotificationTokenSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid notification token payload");
  }

  await enforceRateLimit(authCtx.uid, "registerNotificationToken", 20, 300);

  const privateSettingsRef = db.collection("users").doc(authCtx.uid).collection("private").doc("settings");
  await db.runTransaction(async (transaction) => {
    const settingsSnapshot = await transaction.get(privateSettingsRef);
    const existingRaw = settingsSnapshot.data()?.fcmTokens;
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
      privateSettingsRef,
      {
        fcmTokens: FieldValue.arrayUnion(parsed.data.token),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await logSecurityEvent("notifications.token.register", "info", authCtx.uid, {});
  return { success: true };
});
