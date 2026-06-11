import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'crypto';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const APPROVED_CATEGORIES = [
  "Actors",
  "Directors",
  "Models",
  "Dancers",
  "Musicians",
  "Voice Over",
  "VFX",
  "Writers"
];

function mapRoleToApprovedCategory(role: string | undefined | null): string {
  if (!role) return "Actors";
  
  const clean = role.trim().toLowerCase();
  
  // Direct matches
  if (clean === "actor" || clean === "actors") return "Actors";
  if (clean === "director" || clean === "directors") return "Directors";
  if (clean === "model" || clean === "models") return "Models";
  if (clean === "dancer" || clean === "dancers") return "Dancers";
  if (clean === "musician" || clean === "musicians") return "Musicians";
  if (clean === "voice over" || clean === "voiceover" || clean === "voice-over" || clean === "voice artists" || clean === "voice artist") return "Voice Over";
  if (clean === "vfx" || clean === "editor" || clean === "editors" || clean === "editor/vfx") return "VFX";
  if (clean === "writer" || clean === "writers") return "Writers";
  
  // Legacy mappings
  if (clean === "photographer" || clean === "photographers") return "Models";
  if (clean === "agent" || clean === "agents" || clean === "producer" || clean === "producers") return "Directors";
  if (clean === "talent" || clean === "extras" || clean === "crew" || clean === "crew members") return "Actors";
  
  // Fuzzy match
  for (const cat of APPROVED_CATEGORIES) {
    if (cat.toLowerCase().startsWith(clean) || clean.startsWith(cat.toLowerCase().slice(0, -1))) {
      return cat;
    }
  }
  
  return "Actors";
}

function mapCastingCallType(type: string | undefined | null): string {
  if (!type) return "Actors";
  
  const clean = type.trim().toLowerCase();
  
  // Direct matches
  if (clean === "actor" || clean === "actors") return "Actors";
  if (clean === "director" || clean === "directors") return "Directors";
  if (clean === "model" || clean === "models") return "Models";
  if (clean === "dancer" || clean === "dancers") return "Dancers";
  if (clean === "musician" || clean === "musicians") return "Musicians";
  if (clean === "voice over" || clean === "voiceover" || clean === "voice-over" || clean === "voice artist") return "Voice Over";
  if (clean === "vfx" || clean === "editor" || clean === "editors" || clean === "editor/vfx") return "VFX";
  if (clean === "writer" || clean === "writers") return "Writers";
  
  // Genre mappings (legacy)
  if (clean === "film" || clean === "theatre" || clean === "commercial" || clean === "series" || clean === "short film") {
    return "Actors";
  }
  
  return "Actors";
}

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  console.log("Initializing Firebase Admin with environment service account...");
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
} else {
  console.log("No explicit service account credentials found. Trying default credential initialization...");
  try {
    // Generates a dummy cert if it doesn't find credentials (matches index.ts fallback)
    const { privateKey: dummyPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId || 'nc-network-10d0b',
        clientEmail: clientEmail || 'dummy@example.com',
        privateKey: dummyPrivateKey,
      }),
    });
  } catch (e: any) {
    console.error("Failed to initialize Firebase Admin:", e.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function runMigration() {
  console.log("Starting Firestore category standardization migration...");
  
  try {
    // 1. Migrate Global Settings Document
    console.log("Updating settings/global categories...");
    const settingsRef = db.collection('settings').doc('global');
    await settingsRef.set({
      categories: APPROVED_CATEGORIES
    }, { merge: true });
    console.log("✅ settings/global categories updated to: ", APPROVED_CATEGORIES);

    // 2. Migrate Users
    console.log("Scanning users collection...");
    const usersSnapshot = await db.collection('users').get();
    let usersUpdated = 0;
    let usersChecked = 0;

    for (const doc of usersSnapshot.docs) {
      usersChecked++;
      const data = doc.data();
      const currentRole = data.role;
      
      if (!APPROVED_CATEGORIES.includes(currentRole)) {
        const newRole = mapRoleToApprovedCategory(currentRole);
        console.log(`Updating User [${doc.id}] (${data.name || 'Unknown'}): '${currentRole}' -> '${newRole}'`);
        await doc.ref.update({
          role: newRole,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        usersUpdated++;
      }
    }
    console.log(`✅ Users complete: Checked ${usersChecked}, Updated ${usersUpdated}`);

    // 3. Migrate Profiles
    console.log("Scanning profiles collection...");
    const profilesSnapshot = await db.collection('profiles').get();
    let profilesUpdated = 0;
    let profilesChecked = 0;

    for (const doc of profilesSnapshot.docs) {
      profilesChecked++;
      const data = doc.data();
      const currentRole = data.role;

      if (!APPROVED_CATEGORIES.includes(currentRole)) {
        const newRole = mapRoleToApprovedCategory(currentRole);
        console.log(`Updating Profile [${doc.id}] (${data.name || 'Unknown'}): '${currentRole}' -> '${newRole}'`);
        await doc.ref.update({
          role: newRole,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        profilesUpdated++;
      }
    }
    console.log(`✅ Profiles complete: Checked ${profilesChecked}, Updated ${profilesUpdated}`);

    // 4. Migrate Casting Calls
    console.log("Scanning casting_calls collection...");
    const castingCallsSnapshot = await db.collection('casting_calls').get();
    let castingUpdated = 0;
    let castingChecked = 0;

    for (const doc of castingCallsSnapshot.docs) {
      castingChecked++;
      const data = doc.data();
      const currentType = data.type;

      if (!APPROVED_CATEGORIES.includes(currentType)) {
        const newType = mapCastingCallType(currentType);
        console.log(`Updating Casting Call [${doc.id}] (${data.title || 'Unknown'}): '${currentType}' -> '${newType}'`);
        await doc.ref.update({
          type: newType,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        castingUpdated++;
      }
    }
    console.log(`✅ Casting Calls complete: Checked ${castingChecked}, Updated ${castingUpdated}`);

    console.log("\nMigration completed successfully! 🎉");
    process.exit(0);

  } catch (error: any) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
}

runMigration();
