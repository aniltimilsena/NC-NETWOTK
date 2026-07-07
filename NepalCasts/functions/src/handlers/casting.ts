import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { callableOptions, db } from "../config";
import { assertAuth, assertAdmin } from "../lib/validation";
import { enforceRateLimit, logSecurityEvent } from "../lib/rateLimit";
import {
  AdminCastingSchema,
  AdminCastingUpdateSchema,
  AdminCastingDeleteSchema,
  AdminCastingPrioritySchema
} from "../schemas";

export const adminCreateCastingCall = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminCastingSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call payload");
  }

  await enforceRateLimit(authCtx.uid, "adminCreateCastingCall", 30, 60);
  const payload = {
    ...parsed.data,
    status: "Open",
    createdBy: authCtx.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const docRef = await db.collection("casting_calls").add(payload);

  await logSecurityEvent("casting.admin.create", "info", authCtx.uid, { castingCallId: docRef.id });
  return { id: docRef.id, success: true };
});

export const adminUpdateCastingCall = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminCastingUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call update payload");
  }

  await enforceRateLimit(authCtx.uid, "adminUpdateCastingCall", 40, 60);
  const { id, ...rest } = parsed.data;
  await db.collection("casting_calls").doc(id).set(
    {
      ...rest,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authCtx.uid,
    },
    { merge: true },
  );

  await logSecurityEvent("casting.admin.update", "warning", authCtx.uid, { castingCallId: id, changedKeys: Object.keys(rest) });
  return { success: true };
});

export const adminDeleteCastingCall = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminCastingDeleteSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting call delete payload");
  }

  await enforceRateLimit(authCtx.uid, "adminDeleteCastingCall", 20, 60);
  await db.collection("casting_calls").doc(parsed.data.id).delete();
  await logSecurityEvent("casting.admin.delete", "critical", authCtx.uid, { castingCallId: parsed.data.id });
  return { success: true };
});

export const adminSetCastingPriority = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminCastingPrioritySchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid casting priority payload");
  }

  await enforceRateLimit(authCtx.uid, "adminSetCastingPriority", 60, 60);
  await db.collection("casting_calls").doc(parsed.data.id).set(
    {
      highPriority: parsed.data.highPriority,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authCtx.uid,
    },
    { merge: true },
  );
  await logSecurityEvent("casting.admin.priority", "warning", authCtx.uid, {
    castingCallId: parsed.data.id,
    highPriority: parsed.data.highPriority,
  });
  return { success: true };
});
