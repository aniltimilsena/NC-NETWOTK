// api/cloudinary-config.js
// Returns the public Cloudinary cloud name and unsigned upload preset.
// These values are safe to expose publicly — they're unsigned preset credentials
// designed to be used from client-side code.
// No Firebase auth required here since the values carry no secret.

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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'du7zu8mca';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'stored_media';

  return res.status(200).json({ cloudName, uploadPreset });
};
