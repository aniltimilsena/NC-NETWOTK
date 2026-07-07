import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const enforceRateLimit = async (
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

export const logSecurityEvent = async (
  eventType: string,
  severity: "info" | "warning" | "critical",
  uid: string,
  details: Record<string, unknown>,
): Promise<void> => {
  console.log("security_event", { eventType, severity, uid, ...details });
  await db.collection("securityEvents").add({
    eventType,
    severity,
    uid,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
};
