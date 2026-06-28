const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.server') });
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {}

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin with full service account credentials when available
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    || 'firebase-adminsdk-fbsvc@nc-network-10d0b.iam.gserviceaccount.com';
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'nc-network-10d0b';

  if (privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Local dev fallback - verifyIdToken still works with just projectId
    admin.initializeApp({ projectId });
  }
}

const ALLOWED_ORIGINS = [
  'https://nc-netwotk.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4']);

/**
 * POST a base64 Data URI directly to Cloudinary's unsigned upload REST API.
 * Uses native https to avoid any dependency on axios/form-data.
 */
const uploadToCloudinary = (dataURI, mimeType, cloudName, uploadPreset) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';

    const params = new URLSearchParams({
      file: dataURI,
      upload_preset: uploadPreset,
      folder: 'nc_network/messages',
    });
    const postBuffer = Buffer.from(params.toString(), 'utf8');

    const reqOptions = {
      method: 'POST',
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/${resourceType}/upload`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postBuffer.length,
      },
    };

    const req = https.request(reqOptions, (cloudRes) => {
      let data = '';
      cloudRes.on('data', (chunk) => (data += chunk));
      cloudRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) {
            resolve(json.secure_url);
          } else {
            reject(new Error(json.error?.message || 'Cloudinary upload failed: no secure_url'));
          }
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary response: ' + data.slice(0, 300)));
        }
      });
    });

    req.on('error', reject);
    req.write(postBuffer);
    req.end();
  });
};

module.exports = async (req, res) => {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch (err) {
    console.error('[upload] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Cloudinary config
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'du7zu8mca';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'stored_media';

  // Parse JSON body — Vercel parses JSON automatically (bodyParser is ON by default)
  const body = req.body;
  if (!body || !body.file) {
    return res.status(400).json({ error: 'Missing "file" field in request body (expected base64 Data URI)' });
  }

  const dataURI = body.file;

  // Extract mime type from Data URI: "data:image/jpeg;base64,..."
  const mimeMatch = dataURI.match(/^data:([^;]+);base64,/);
  if (!mimeMatch) {
    return res.status(400).json({ error: 'Invalid file format. Expected a base64 Data URI.' });
  }
  const mimeType = mimeMatch[1];

  // Validate mime type
  if (!ALLOWED_IMAGE_TYPES.has(mimeType) && !ALLOWED_VIDEO_TYPES.has(mimeType)) {
    return res.status(400).json({ error: `Invalid file type: ${mimeType}. Only images and MP4 videos allowed.` });
  }

  // Estimate size (base64 string length * 0.75 ≈ bytes)
  const estimatedBytes = Math.ceil((dataURI.length - mimeMatch[0].length) * 0.75);
  const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (estimatedBytes > maxSize) {
    return res.status(400).json({ error: `File too large. Max: ${isVideo ? '50MB' : '10MB'}` });
  }

  // Upload to Cloudinary
  try {
    const secureUrl = await uploadToCloudinary(dataURI, mimeType, cloudName, uploadPreset);
    console.log('[upload] Cloudinary success:', secureUrl);
    return res.status(200).json({ url: secureUrl });
  } catch (err) {
    console.error('[upload] Cloudinary error:', err.message);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

// NOTE: bodyParser is ON (default) so Vercel parses JSON automatically.
// Do NOT set bodyParser: false here.
module.exports.config = {
  api: {
    sizeLimit: '15mb',
  },
};
