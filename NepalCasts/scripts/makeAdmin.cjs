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
  console.log('Initialized Firebase Admin using credentials from .env/.env.server');
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
const auth = getAuth();

const targetEmail = process.argv[2] || 'aniltimilsena53@gmail.com';

const makeAdmin = async () => {
  console.log(`Searching for user with email: ${targetEmail}...`);

  let authUser;
  try {
    authUser = await auth.getUserByEmail(targetEmail);
    console.log(`Found Auth User: uid=${authUser.uid}, email=${authUser.email}`);
  } catch (error) {
    console.error(`Could not find user in Firebase Auth with email ${targetEmail}:`, error.message);
    console.log('\nLet\'s check the Firestore users collection...');
  }

  // 1. Update Firestore User Document
  const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).get();
  if (usersSnapshot.empty) {
    console.log(`No user document found in Firestore 'users' collection with email ${targetEmail}`);
    if (authUser) {
      console.log(`Creating users doc for ${targetEmail} in Firestore...`);
      await db.collection('users').doc(authUser.uid).set({
        uid: authUser.uid,
        email: targetEmail,
        name: authUser.displayName || 'NC Admin',
        role: 'Admin',
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      console.log(`✅ Created Firestore user document for uid: ${authUser.uid}`);
    }
  } else {
    for (const doc of usersSnapshot.docs) {
      await doc.ref.update({
        isAdmin: true,
        role: 'Admin'
      });
      console.log(`✅ Updated Firestore user document ${doc.id} (isAdmin: true, role: 'Admin')`);
    }
  }

  // 2. Set Custom User Claims on Firebase Auth
  if (authUser) {
    await auth.setCustomUserClaims(authUser.uid, { admin: true });
    console.log(`✅ Set Custom Auth Claim { admin: true } on Firebase Auth for user: ${authUser.uid}`);
  }

  console.log(`\nSuccessfully made ${targetEmail} an Admin!`);
  process.exit(0);
};

makeAdmin().catch(error => {
  console.error('Error making user admin:', error);
  process.exit(1);
});
