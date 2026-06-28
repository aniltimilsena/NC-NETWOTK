const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.server') });
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {}

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin
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

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4']);

/**
 * Read full body from req as a Buffer.
 */
const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/**
 * Parse multipart/form-data buffer manually.
 * Returns { fileBuffer, mimeType } for the first 'file' field.
 */
const parseMultipart = (body, contentType) => {
  // Extract boundary from Content-Type header
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i);
  if (!boundaryMatch) throw new Error('No boundary found in Content-Type');
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  // Split body on boundaries
  const delimiter = Buffer.from('\r\n--' + boundary);
  const closingDelimiter = Buffer.from('\r\n--' + boundary + '--');

  let fileBuffer = null;
  let mimeType = null;

  // Split the body into parts
  const fullDelimiter = Buffer.from('--' + boundary);
  let offset = 0;

  // Find first delimiter
  let start = body.indexOf(fullDelimiter);
  if (start === -1) throw new Error('Multipart body: no parts found');

  // Walk through parts
  while (true) {
    // After the delimiter line, skip \r\n
    let partStart = body.indexOf('\r\n', start) + 2;
    if (partStart <= 1) break;

    // Find the next delimiter
    let nextDelim = body.indexOf(delimiter, partStart);
    if (nextDelim === -1) {
      nextDelim = body.indexOf(closingDelimiter, partStart);
      if (nextDelim === -1) break;
    }

    const part = body.slice(partStart, nextDelim);

    // Separate headers and body within this part
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      start = nextDelim;
      continue;
    }

    const headerSection = part.slice(0, headerEnd).toString('utf8');
    const partBody = part.slice(headerEnd + 4);

    // Check if this part has name="file"
    const dispositionMatch = headerSection.match(/Content-Disposition:.*name="([^"]+)"/i);
    const fieldName = dispositionMatch ? dispositionMatch[1] : null;

    if (fieldName === 'file') {
      const ctMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
      mimeType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream';
      fileBuffer = partBody;
    }

    start = nextDelim;
    // If this was the closing delimiter, stop
    if (body.indexOf('--', nextDelim + 2) === nextDelim + 2 &&
        body.slice(nextDelim + 2 + boundary.length, nextDelim + 2 + boundary.length + 2).toString() === '--') {
      break;
    }
  }

  if (!fileBuffer) throw new Error('No "file" field found in multipart body');
  return { fileBuffer, mimeType };
};

/**
 * POST a base64 Data URI to Cloudinary's unsigned upload API.
 */
const uploadToCloudinary = (fileBuffer, mimeType, cloudName, uploadPreset) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
    const b64 = fileBuffer.toString('base64');
    const dataURI = `data:${mimeType};base64,${b64}`;

    // Build a simple URL-encoded form body — most reliable with native https
    const params = new URLSearchParams({
      file: dataURI,
      upload_preset: uploadPreset,
      folder: 'nc_network/messages',
    });
    const postBody = params.toString();
    const postBuffer = Buffer.from(postBody, 'utf8');

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
          reject(new Error('Failed to parse Cloudinary response: ' + data.slice(0, 200)));
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

  // Cloudinary config from Vercel env vars with public fallbacks
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'du7zu8mca';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'stored_media';

  if (!cloudName || !uploadPreset) {
    console.error('[upload] CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET not set.');
    return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
  }

  // Read entire body into memory
  let rawBody;
  try {
    rawBody = await readBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to read request body: ' + err.message });
  }

  // Parse multipart
  let fileBuffer, mimeType;
  try {
    ({ fileBuffer, mimeType } = parseMultipart(rawBody, req.headers['content-type'] || ''));
  } catch (err) {
    console.error('[upload] Multipart parse error:', err.message);
    return res.status(400).json({ error: 'Failed to parse file: ' + err.message });
  }

  // Validate mime type
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
  if (!isImage && !isVideo) {
    return res.status(400).json({ error: `Invalid file type: ${mimeType}` });
  }

  // Size check
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (fileBuffer.length > maxSize) {
    return res.status(400).json({ error: `File too large. Max: ${isVideo ? '50MB' : '10MB'}` });
  }

  // Upload to Cloudinary
  try {
    const secureUrl = await uploadToCloudinary(fileBuffer, mimeType, cloudName, uploadPreset);
    console.log('[upload] Cloudinary success:', secureUrl);
    return res.status(200).json({ url: secureUrl });
  } catch (err) {
    console.error('[upload] Cloudinary error:', err.message);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
};
