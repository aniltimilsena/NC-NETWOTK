import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import { callableOptions, db } from "../config";
import { assertAuth } from "../lib/validation";
import { enforceRateLimit, logSecurityEvent } from "../lib/rateLimit";
import { BootstrapUserSchema, ProfileUpdateSchema } from "../schemas";

export const bootstrapUserProfile = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = BootstrapUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user profile payload");
  }

  await enforceRateLimit(authCtx.uid, "bootstrapUserProfile", 5, 60);

  const now = FieldValue.serverTimestamp();
  const profileName = parsed.data.name;
  const role = parsed.data.role ?? "Talent";
  const gender = parsed.data.gender ?? "";
  const authEmail = typeof authCtx.token.email === "string" ? authCtx.token.email : null;
  const email = parsed.data.email ?? authEmail;

  await db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(authCtx.uid);
    const profileRef = db.collection("profiles").doc(authCtx.uid);

    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      transaction.set(userRef, {
        uid: authCtx.uid,
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
        uid: authCtx.uid,
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

  if (email === "aniltimilsena53@gmail.com") {
    try {
      await getAuth().setCustomUserClaims(authCtx.uid, { admin: true });
    } catch (claimErr) {
      logger.error("Failed to set bootstrap custom claim:", claimErr);
    }
  }

  await logSecurityEvent("user.bootstrap", "info", authCtx.uid, { hasEmail: !!email });
  return { success: true };
});

export const upsertProfile = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  const parsed = ProfileUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid profile update payload");
  }

  await enforceRateLimit(authCtx.uid, "upsertProfile", 30, 60);

  await db.collection("profiles").doc(authCtx.uid).set(
    {
      ...parsed.data,
      uid: authCtx.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await logSecurityEvent("profile.update", "info", authCtx.uid, { keys: Object.keys(parsed.data) });
  return { success: true };
});
