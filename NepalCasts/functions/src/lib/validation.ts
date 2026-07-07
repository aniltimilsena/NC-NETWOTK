import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export type AuthContext = { uid: string; token: Record<string, unknown> };

export const assertAuth = (auth: { uid?: string; token?: Record<string, unknown> } | null): AuthContext => {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return { uid: auth.uid, token: auth.token ?? {} };
};

export const assertConversationParticipant = async (conversationId: string, uid: string) => {
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

export const assertAdmin = async (auth: AuthContext): Promise<void> => {
  if (auth.token.admin === true) {
    return;
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (userDoc.exists && userDoc.data()?.isAdmin === true) {
    try {
      await getAuth().setCustomUserClaims(auth.uid, { admin: true });
    } catch (err) {
      logger.error(`Failed to auto-set custom claim for user ${auth.uid}:`, err);
    }
    return;
  }
  throw new HttpsError("permission-denied", "Admin role required");
};
