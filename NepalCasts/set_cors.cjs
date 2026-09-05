const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const rootDir = __dirname;

const parseEnv = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  });
  return env;
};

const env = parseEnv(path.join(rootDir, '.env'));
const envServer = parseEnv(path.join(rootDir, '.env.server'));

const projectId = envServer['FIREBASE_PROJECT_ID'] || env['VITE_FIREBASE_PROJECT_ID'] || 'nc-network-10d0b';
const clientEmail = envServer['FIREBASE_CLIENT_EMAIL'];
const privateKey = envServer['FIREBASE_PRIVATE_KEY'];

if (!clientEmail || !privateKey) {
  console.error('FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY not found in .env.server. Cannot set CORS.');
  process.exit(1);
}

const gcs = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, '\n'),
  }
});

const corsConfiguration = [
  {
    maxAgeSeconds: 3600,
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://nc-netwotk.vercel.app',
      'https://nepalcasts.com',
      'https://www.nepalcasts.com'
    ],
    responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable', 'x-firebase-storage-version'],
  }
];

const configureCors = async () => {
  const buckets = [
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`
  ];

  for (const bucketName of buckets) {
    try {
      console.log(`Setting CORS configuration for bucket: ${bucketName}...`);
      const bucket = gcs.bucket(bucketName);
      await bucket.setCorsConfiguration(corsConfiguration);
      console.log(`Successfully set CORS for bucket: ${bucketName}!`);
    } catch (err) {
      console.warn(`Could not set CORS for bucket ${bucketName}:`, err.message);
    }
  }
};

configureCors().then(() => {
  console.log('CORS setup complete.');
  process.exit(0);
}).catch(err => {
  console.error('Failed to configure CORS:', err);
  process.exit(1);
});
