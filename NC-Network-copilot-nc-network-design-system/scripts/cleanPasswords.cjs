const path = require('path');
const fs = require('fs');

// Manually parse .env in the parent directory of this script to avoid external dependency issues
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        // Remove enclosing quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
    console.log('Manually loaded environment variables from .env');
  } catch (err) {
    console.warn('Failed to parse .env file:', err.message);
  }
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: `${projectId}.appspot.com`
  });
  console.log('Initialized Firebase Admin using credentials from .env');
} else {
  // Try to check if serviceAccount.json exists
  const saPath = path.resolve(__dirname, './serviceAccount.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath);
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log('Initialized Firebase Admin using serviceAccount.json');
  } else {
    // Basic initialization (rely on ADC / local credentials)
    initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`
    });
    console.log('Initialized Firebase Admin with default credentials');
  }
}

const db = getFirestore();

const cleanPasswords = async () => {
  console.log('Starting passwords cleanup scan...');
  
  const usersSnapshot = await db.collection('users').get();
  let cleaned = 0;
  let clean = 0;

  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data();
    const hasPassword = 'password' in data;
    const hasPasswordHash = 'passwordHash' in data;
    const hasPasswordReset = 'passwordReset' in data;

    if (hasPassword || hasPasswordHash || hasPasswordReset) {
      // Remove password fields from Firestore
      const updates = {};
      if (hasPassword) {
        updates.password = FieldValue.delete();
      }
      if (hasPasswordHash) {
        updates.passwordHash = FieldValue.delete();
      }
      if (hasPasswordReset) {
        updates.passwordReset = FieldValue.delete();
      }
      
      await userDoc.ref.update(updates);
      console.log(`✅ Cleaned password fields from user doc: ${userDoc.id}`);
      cleaned++;
    } else {
      console.log(`✓ User doc already clean: ${userDoc.id}`);
      clean++;
    }
  }

  // Also check profiles collection
  const profilesSnapshot = await db.collection('profiles').get();
  for (const profileDoc of profilesSnapshot.docs) {
    const data = profileDoc.data();
    const hasPassword = 'password' in data;
    const hasPasswordHash = 'passwordHash' in data;

    if (hasPassword || hasPasswordHash) {
      const updates = {};
      if (hasPassword) {
        updates.password = FieldValue.delete();
      }
      if (hasPasswordHash) {
        updates.passwordHash = FieldValue.delete();
      }
      
      await profileDoc.ref.update(updates);
      console.log(`✅ Cleaned password fields from profile doc: ${profileDoc.id}`);
      cleaned++;
    } else {
      console.log(`✓ Profile doc already clean: ${profileDoc.id}`);
      clean++;
    }
  }

  console.log(`
Cleanup complete:
  ✅ Cleaned: ${cleaned} documents
  ✓  Already clean: ${clean} documents
  `);
  process.exit(0);
};

cleanPasswords().catch(error => {
  console.error('Password cleanup script error:', error);
  process.exit(1);
});
