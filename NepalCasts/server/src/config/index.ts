/**
 * @module server/config
 * @description Centralised environment loading, Firebase Admin initialisation,
 * and shared singleton exports used across the Express server.
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env.server') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.server') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Firebase Admin
// ---------------------------------------------------------------------------

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
  } else {
    let initialized = false;
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
        storageBucket: projectId ? `${projectId}.appspot.com` : undefined,
      });
      console.log("🚀 Firebase Admin initialized successfully using Application Default Credentials (ADC).");
      initialized = true;
    } catch (_adcError) {
      // ADC not available — fall through to dummy key
    }

    if (!initialized) {
      console.warn("⚠️ Firebase Admin credentials are not fully configured in environment variables.");
      console.warn("Initializing Firebase Admin with dynamically generated dummy credentials for local startup.");

      const { privateKey: dummyPrivateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId || 'nc-network-default',
          clientEmail: clientEmail || 'dummy@example.com',
          privateKey: dummyPrivateKey,
        }),
        storageBucket: `${projectId || 'nc-network-default'}.appspot.com`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

export const db = admin.firestore();
export const bucket = admin.storage().bucket();
export { admin };

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

export const app = express();
export const PORT = process.env.PORT || 5000;
