import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();

export const DEFAULT_REGION = process.env.FUNCTIONS_REGION ?? "us-central1";
export const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";
export const MAX_FCM_TOKENS = 20;

export const callableOptions = {
  region: DEFAULT_REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  maxInstances: 20,
};
