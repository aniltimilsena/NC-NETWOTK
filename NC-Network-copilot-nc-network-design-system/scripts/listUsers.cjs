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
} else {
  const saPath = path.resolve(__dirname, './serviceAccount.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath);
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  } else {
    initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`
    });
  }
}

const db = getFirestore();

const listUsers = async () => {
  console.log('Querying users in Firestore...');
  const usersSnapshot = await db.collection('users').get();
  if (usersSnapshot.empty) {
    console.log('No users found in the database.');
    process.exit(0);
  }
  
  console.log(`Found ${usersSnapshot.size} users:`);
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- UID: ${doc.id}`);
    console.log(`  Name: ${data.name || 'N/A'}`);
    console.log(`  Email: ${data.email || 'N/A'}`);
    console.log(`  Role: ${data.role || 'N/A'}`);
    console.log(`  isAdmin: ${data.isAdmin || false}`);
    console.log('------------------------------------');
  });
  
  process.exit(0);
};

listUsers().catch(error => {
  console.error('Error listing users:', error);
  process.exit(1);
});
