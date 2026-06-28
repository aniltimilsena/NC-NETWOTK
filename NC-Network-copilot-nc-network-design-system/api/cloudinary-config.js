

const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.server') });
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) { }

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'nc-network-10d0b',
  });
}

const ALLOWED_ORIGINS = [
  'https://nc-netwotk.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

module.exports = async (req, res) => {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Require a valid Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch (err) {
    console.error('[cloudinary-config] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.error('[cloudinary-config] CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET not set in Vercel environment variables.');
    return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
  }

  // Only the public-safe values are returned.
  // CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are intentionally omitted.
  return res.status(200).json({ cloudName, uploadPreset });
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
