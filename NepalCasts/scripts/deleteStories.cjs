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

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

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
const bucket = getStorage().bucket();

const deleteCollection = async (collectionName) => {
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`No documents in ${collectionName}`);
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${snapshot.size} docs from ${collectionName}`);
};

const deleteStorageFolder = async (folderPath) => {
  try {
    const [files] = await bucket.getFiles({ prefix: folderPath });
    if (files.length === 0) {
      console.log(`No files in storage/${folderPath}`);
      return;
    }
    await Promise.all(files.map(file => {
      console.log(`Deleting file: ${file.name}`);
      return file.delete();
    }));
    console.log(`Deleted ${files.length} files from storage/${folderPath}`);
  } catch (error) {
    console.error(`Error deleting ${folderPath} from storage:`, error.message);
  }
};

const main = async () => {
  console.log('Starting story data cleanup...');
  await deleteCollection('stories');
  await deleteCollection('story_replies');
  await deleteStorageFolder('stories/');
  console.log('All story data and files purged successfully');
  process.exit(0);
};

main().catch(error => {
  console.error('Cleanup script error:', error);
  process.exit(1);
});
