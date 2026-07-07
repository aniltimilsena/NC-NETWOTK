const path = require('path');
const fs = require('fs');

// Load environment variables from .env
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
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn('Failed to parse .env file:', err.message);
  }
}

// Load environment variables from .env.server
const envServerPath = path.resolve(__dirname, '../.env.server');
if (fs.existsSync(envServerPath)) {
  try {
    const envContent = fs.readFileSync(envServerPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn('Failed to parse .env.server file:', err.message);
  }
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

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
  console.log('Initialized Firebase Admin using credentials from environment variables.');
} else {
  const saPath = path.resolve(__dirname, './serviceAccount.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath);
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log('Initialized Firebase Admin using serviceAccount.json');
  } else {
    initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`
    });
    console.log('Initialized Firebase Admin with default credentials');
  }
}

const db = getFirestore();
const auth = getAuth();

const syncAllAdminClaims = async () => {
  console.log('Querying Firestore users where isAdmin is true...');
  const adminQuery = await db.collection('users').where('isAdmin', '==', true).get();
  
  if (adminQuery.empty) {
    console.log('No administrator documents found in Firestore.');
    process.exit(0);
  }

  console.log(`Found ${adminQuery.size} administrator documents. Synchronizing claims...`);
  
  for (const doc of adminQuery.docs) {
    const uid = doc.id;
    const data = doc.data();
    
    try {
      console.log(`Syncing UID: ${uid} (Name: ${data.name || 'N/A'}, Email: ${data.email || 'N/A'})`);
      
      // Update Firebase Auth claims
      await auth.setCustomUserClaims(uid, { admin: true });
      console.log(`  \u2705 Successfully set custom claim { admin: true }`);
    } catch (err) {
      console.error(`  \u274c Failed to set claims for user ${uid}:`, err.message);
    }
  }

  console.log('\nClaims synchronization complete!');
  process.exit(0);
};

syncAllAdminClaims().catch(error => {
  console.error('Error synchronizing admin claims:', error);
  process.exit(1);
});
