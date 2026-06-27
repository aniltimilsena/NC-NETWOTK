import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import * as admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { Readable } from 'stream';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import twilio from 'twilio';

// Load env from current directory first, then fallback to server and parent directories
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env.server') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.server') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type AuthedRequest<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, unknown>
> = Request<TParams, unknown, TBody, TQuery> & {
  user?: admin.auth.DecodedIdToken;
  file?: Express.Multer.File;
};

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
  } else {
    // Try to load credentials from Application Default Credentials (ADC)
    let initialized = false;
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
        storageBucket: projectId ? `${projectId}.appspot.com` : undefined,
      });
      console.log("🚀 Firebase Admin initialized successfully using Application Default Credentials (ADC).");
      initialized = true;
    } catch (adcError) {
      // Proceed to dummy cert initialization
    }

    if (!initialized) {
      console.warn("⚠️ Firebase Admin credentials are not fully configured in environment variables.");
      console.warn("Initializing Firebase Admin with dynamically generated dummy credentials for local startup.");
      
      // Generate a structurally valid RSA private key PEM dynamically
      const { privateKey: dummyPrivateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId || 'nc-network-default',
          clientEmail: clientEmail || 'dummy@example.com',
          privateKey: dummyPrivateKey,
        }),
        storageBucket: `${projectId || 'nc-network-default'}.appspot.com`,
      });
    }
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log("🚀 Cloudinary initialized successfully on server boot.");
  } else {
    console.warn("⚠️ Cloudinary credentials are not fully configured in environment variables.");
  }
};
configureCloudinary();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Always allow standard local development origins
if (!allowedOrigins.includes('http://localhost:5173')) {
  allowedOrigins.push('http://localhost:5173');
}
if (!allowedOrigins.includes('http://127.0.0.1:5173')) {
  allowedOrigins.push('http://127.0.0.1:5173');
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
const messageWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many messages from this IP, please try again in a minute',
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many upload attempts from this IP, please try again later',
});
const MAX_FCM_TOKENS = 20;
const FCM_TOKEN_LIMIT_REACHED = 'FCM_TOKEN_LIMIT_REACHED';

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

function formatMessagePreview(text: string): string {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  const trimmed = text.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('/video/')) {
      return '🎥 Sent a video';
    }
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('/image/') || lower.includes('cloudinary')) {
      return '📷 Sent a photo';
    }
    return '🔗 Sent a link';
  }
  return text;
}

const maskDestination = (method: string, phone: string, email: string) => {
  if (method === 'email') {
    const [name, domain] = (email || '').split('@');
    if (!name || !domain) return 'your email';
    const masked = name[0] + '*'.repeat(Math.max(name.length - 2, 1)) + name.slice(-1);
    return `${masked}@${domain}`;
  }
  if (method === 'sms') {
    const cleanPhone = phone || '';
    return `+${'*'.repeat(Math.max(cleanPhone.length - 4, 3))}${cleanPhone.slice(-4)}`;
  }
  return 'your device';
};

// Send OTP via Email
const sendOTPEmail = async (email: string, code: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"NC Network" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your NC Network Verification Code',
    html: `
      <div style="font-family: Arial; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #FFD700;">NC Network</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #00BFFF; font-size: 36px;">
          ${code}
        </h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};

// Send OTP via SMS (using Twilio)
const sendOTPSMS = async (phone: string, code: string) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: `Your NC Network verification code: ${code}. Expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};


interface OneSignalNotificationPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

async function sendOneSignalNotification({ userIds, title, body, url }: OneSignalNotificationPayload) {
  const appId = process.env.ONESIGNAL_APP_ID || "a9962176-972c-4874-8161-ec84428e9036";
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey || restApiKey === 'your_onesignal_rest_api_key_here') {
    console.warn("⚠️ OneSignal Notification skipped: ONESIGNAL_REST_API_KEY is placeholder or not defined.");
    return;
  }

  try {
    const payload = {
      app_id: appId,
      contents: { en: body },
      headings: { en: title },
      url: url ? `${process.env.APP_URL || 'http://localhost:5173'}${url}` : undefined,
      include_aliases: {
        external_id: userIds
      },
      target_channel: "push"
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OneSignal Notification failed:", data);
    } else {
      console.log("🚀 OneSignal Notification sent successfully:", data);
    }
  } catch (error) {
    console.error("❌ Failed to send OneSignal notification:", error);
  }
}


app.use(helmet({
  frameguard: false, // Disable legacy X-Frame-Options in favor of Content-Security-Policy frame-ancestors
  xssFilter: false,  // Disable deprecated X-XSS-Protection header
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));

// Custom middleware to set proper cache-control and clear deprecated headers for all API responses
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, private');
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
  res.removeHeader('X-XSS-Protection');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin rejected'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
}));
app.use(limiter);
app.use(express.json());
app.use(morgan('dev'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to support video uploads
  fileFilter: (_req, file, callback) => {
    const isImage = allowedImageMimeTypes.has(file.mimetype);
    const isVideo = allowedVideoMimeTypes.has(file.mimetype);
    if (!isImage && !isVideo) {
      callback(new Error('Only image and video uploads are allowed'));
      return;
    }
    callback(null, true);
  },
});

const ProfileSchema = z.object({
  name: z.string().min(2).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(['Actors', 'Directors', 'Models', 'Dancers', 'Musicians', 'Voice Over', 'VFX', 'Writers']).optional(),
  location: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  experience: z.array(z.any()).optional(),
  openToWork: z.boolean().optional(),
  openToAudition: z.boolean().optional(),
  category: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  image: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  showContactInfo: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});

const CastingCallSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().or(z.string().min(0)),
  type: z.string(),
  budget: z.string().optional(),
  location: z.string(),
  thumbnail: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  deadline: z.string().optional(),
  production: z.string().optional(),
  creatorName: z.string().optional(),
  creatorEmail: z.string().optional(),
  roles: z.array(z.any()).optional(),
  id: z.string().optional(),
});

const MessageSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file', 'video']).optional().default('text'),
  isSystem: z.boolean().optional().default(false),
  replyTo: z.object({
    id: z.string(),
    text: z.string(),
    senderId: z.string(),
  }).nullable().optional(),
  clientMsgId: z.string().optional().nullable(),
});
const NotificationTokenSchema = z.object({
  token: z.string().min(50).max(4096),
});

const verifyToken = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const bearerHeader = req.headers.authorization;
  const match = bearerHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).send('Invalid token');
  }
};

const isAdmin = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).send('Unauthorized');
    return;
  }

  if (req.user?.admin === true) {
    next();
    return;
  }

  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data()?.isAdmin) {
    next();
    return;
  }
  res.status(403).send('Forbidden: Admin access required');
};

const assertParticipant = async (
  conversationId: string,
  userId: string,
  res: Response
): Promise<admin.firestore.DocumentSnapshot | null> => {
  try {
    const convoDoc = await db
      .collection('conversations')
      .doc(conversationId)
      .get();

    if (!convoDoc.exists) {
      res.status(404).json({ error: 'Conversation not found' });
      return null;
    }

    const participants = convoDoc.data()?.participants || [];
    if (!participants.includes(userId)) {
      res.status(403).json({ error: 'Forbidden: You are not a participant' });
      return null;
    }

    return convoDoc;
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
    return null;
  }
};

const assertMessageOwner = async (
  conversationId: string,
  messageId: string,
  userId: string,
  res: Response
): Promise<admin.firestore.DocumentSnapshot | null> => {
  try {
    // First verify participant
    const convo = await assertParticipant(conversationId, userId, res);
    if (!convo) return null;

    const msgDoc = await db
      .collection('conversations').doc(conversationId)
      .collection('messages').doc(messageId)
      .get();

    if (!msgDoc.exists) {
      res.status(404).json({ error: 'Message not found' });
      return null;
    }

    if (msgDoc.data()?.senderId !== userId) {
      res.status(403).json({ error: 'Forbidden: You did not send this message' });
      return null;
    }

    return msgDoc;
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
    return null;
  }
};


const uploadToCloudinary = (fileBuffer: Buffer, mimeType: string, folder: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const isVideo = mimeType.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    console.log(`[Cloudinary] Starting upload. Mime: ${mimeType}, Folder: ${folder}, CloudName: ${cloudName}, HasKey: ${!!apiKey}, HasSecret: ${!!apiSecret}, Preset: ${uploadPreset}`);

    if (cloudName && apiKey && apiSecret && apiKey !== 'dummy' && apiSecret !== 'dummy') {
      try {
        // Global config update for this call
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error('[Cloudinary SDK Error]:', error);
              reject(new Error(error.message));
            } else if (result && result.secure_url) {
              console.log('[Cloudinary SDK Success]:', result.secure_url);
              resolve(result.secure_url);
            } else {
              reject(new Error('Cloudinary upload failed: Empty result'));
            }
          }
        );

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      } catch (err: any) {
        console.error('[Cloudinary SDK Catch Error]:', err);
        reject(err);
      }
    } else if (cloudName && uploadPreset) {
      try {
        const formData = new FormData();
        const blob = new Blob([fileBuffer as any], { type: mimeType });
        const ext = mimeType.split('/')[1] || 'bin';
        const fileName = `upload.${ext}`;
        formData.append('file', blob, fileName);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (response.data && response.data.secure_url) {
          console.log('[Cloudinary Unsigned Success]:', response.data.secure_url);
          resolve(response.data.secure_url);
        } else {
          reject(new Error('Cloudinary unsigned upload failed: secure_url not found in response'));
        }
      } catch (err: any) {
        const errMsg = err.response?.data?.error?.message || err.message;
        console.error('[Cloudinary Unsigned Error]:', errMsg);
        reject(new Error(`Cloudinary unsigned upload failed: ${errMsg}`));
      }
    } else {
      reject(new Error('Cloudinary is not configured on the server. Please define CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'));
    }
  });
};

app.get('/api/config/cloudinary', verifyToken, (req: AuthedRequest, res: Response) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
    return;
  }
  res.json({
    cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  });
});

app.post('/api/upload', verifyToken, uploadLimiter, upload.single('file'), async (req: AuthedRequest, res: Response) => {
  if (!req.file || !req.user) {
    res.status(400).send('No file uploaded');
    return;
  }

  try {
    const { mimetype, buffer, size } = req.file;
    const isVideo = allowedVideoMimeTypes.has(mimetype);
    const isImage = allowedImageMimeTypes.has(mimetype);

    if (!isImage && !isVideo) {
      res.status(400).send('Invalid file type. Only images and videos are allowed.');
      return;
    }

    // Validate size limit based on category
    const maxAllowedSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (size > maxAllowedSize) {
      res.status(400).send(`File size exceeds limit (${isVideo ? '50MB for videos' : '10MB for images'})`);
      return;
    }

    let finalBuffer = buffer;
    let finalMimeType = mimetype;

    if (isImage) {
      try {
        finalBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        finalMimeType = 'image/webp';
      } catch (sharpError) {
        console.warn('Sharp optimization failed, uploading original image:', sharpError);
      }
    }

    const folder = `nc_network/users/${req.user.uid}`;
    const secureUrl = await uploadToCloudinary(finalBuffer, finalMimeType, folder);

    res.json({ url: secureUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
});

// Upload avatar
app.post('/api/upload/avatar', verifyToken, uploadLimiter, upload.single('avatar'), async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.file || !req.user) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const userId = req.user.uid;

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary with auto-optimization
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `nc-network/avatars/${userId}`,
      public_id: 'profile',
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    // Save URL to Firestore in both users and profiles collections
    const userRef = db.collection('users').doc(userId);
    const profileRef = db.collection('profiles').doc(userId);

    await db.runTransaction(async (transaction) => {
      transaction.update(userRef, { photoURL: result.secure_url, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      transaction.update(profileRef, { image: result.secure_url, photoURL: result.secure_url, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    res.json({ 
      success: true, 
      url: result.secure_url 
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Upload casting banner
app.post('/api/upload/casting/:castingId', verifyToken, upload.single('banner'), async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.file || !req.user) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const { castingId } = req.params;
    const userId = req.user.uid;

    // Verify ownership
    if (castingId !== 'new') {
      const castingDoc = await db.collection('casting_calls').doc(castingId).get();
      if (!castingDoc.exists) {
        res.status(404).json({ error: 'Casting call not found' });
        return;
      }
      if (castingDoc.data()?.createdBy !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `nc-network/castings/${castingId}`,
      public_id: 'banner',
      overwrite: true,
      transformation: [
        { width: 1200, height: 600, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    res.json({ 
      success: true, 
      url: result.secure_url 
    });
  } catch (error: any) {
    console.error('Casting banner upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Upload media (photos + videos)
app.post('/api/upload/media', verifyToken, uploadLimiter, upload.array('media', 10), async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.files || !req.user) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const userId = req.user.uid;
    const results = [];

    for (const file of files) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const isVideo = file.mimetype.startsWith('video/');
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: `nc-network/media/${userId}`,
        resource_type: isVideo ? 'video' : 'image',
        transformation: isVideo ? [] : [
          { width: 1080, quality: 'auto', fetch_format: 'auto' }
        ],
      });

      // Save to Firestore users -> media subcollection
      const mediaRef = await db
        .collection('users').doc(userId)
        .collection('media').add({
          url: result.secure_url,
          publicId: result.public_id,
          type: isVideo ? 'video' : 'image',
          width: result.width,
          height: result.height,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      results.push({ 
        id: mediaRef.id, 
        url: result.secure_url 
      });
    }

    res.json({ success: true, files: results });
  } catch (error: any) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Delete media
app.delete('/api/upload/media/:mediaId', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.user.uid;
    const { mediaId } = req.params;

    const mediaDoc = await db
      .collection('users').doc(userId)
      .collection('media').doc(mediaId).get();

    if (!mediaDoc.exists) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const publicId = mediaDoc.data()?.publicId;
    const mediaType = mediaDoc.data()?.type || 'image';

    // Delete from Cloudinary
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: mediaType === 'video' ? 'video' : 'image'
      });
    }

    // Delete from Firestore
    await mediaDoc.ref.delete();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Media deletion error:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

app.get('/api/admin/users', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const snapshot = await db.collection('profiles').get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Remove sensitive properties
      delete data.twoFactorBackupCodes;
      delete data.twoFactorSecret;
      return { id: doc.id, ...data };
    });
    res.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    res.status(500).json({ error: message });
  }
});

const AdminLogSchema = z.object({
  action: z.string().min(1).max(200),
  targetId: z.string().max(200).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

app.post('/api/admin/log', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const validated = AdminLogSchema.parse(req.body);
    const adminEmail = req.user?.email || "Unknown Admin";

    await db.collection('admin_logs').add({
      adminEmail,
      action: validated.action,
      targetId: validated.targetId || null,
      details: validated.details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    res.status(500).json({ error: 'Failed to write admin log' });
  }
});

const AdminSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  maxUploadSizeMB: z.number().min(1).max(100).optional(),
  allowedFileTypes: z.array(z.string().max(50)).max(20).optional(),
  siteName: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  maxMessageLength: z.number().min(1).max(10000).optional(),
}).passthrough();

app.post('/api/admin/settings', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const settings = AdminSettingsSchema.parse(req.body);
    await db.collection('settings').doc('global').set({
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    res.status(500).json({ error: 'Failed to update global settings' });
  }
});

app.get('/api/profile/:uid', verifyToken, async (req: AuthedRequest<{ uid: string }>, res: Response) => {
  try {
    const docRef = await db.collection('profiles').doc(req.params.uid).get();
    if (!docRef.exists) {
      res.status(404).send('Profile not found');
      return;
    }
    const data = docRef.data();
    if (data) {
      // Remove sensitive properties
      delete data.twoFactorBackupCodes;
      delete data.twoFactorSecret;
    }
    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    res.status(500).json({ error: message });
  }
});

app.post('/api/profile', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = ProfileSchema.parse(req.body);
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    await db.collection('profiles').doc(uid).set({
      ...validatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Also update users/{uid} for shared fields to keep them in sync
    const userUpdate: Record<string, any> = {};
    if (validatedData.name !== undefined) userUpdate.name = validatedData.name;
    if (validatedData.role !== undefined) userUpdate.role = validatedData.role;
    if (validatedData.gender !== undefined) userUpdate.gender = validatedData.gender;

    if (Object.keys(userUpdate).length > 0) {
      await db.collection('users').doc(uid).set(userUpdate, { merge: true });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Profile update failed:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    res.status(500).json({ error: message });
  }
});

app.get('/api/casting', async (req: Request, res: Response) => {
  try {
    const filter = req.query.filter as string | undefined;
    const limitVal = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 50;
    const lastDocId = req.query.lastDocId as string | undefined;

    let castingQuery = db.collection('casting_calls').orderBy('createdAt', 'desc');

    if (filter && filter !== 'All' && filter !== 'Saved') {
      castingQuery = castingQuery.where('type', '==', filter);
    }

    if (lastDocId) {
      const lastDoc = await db.collection('casting_calls').doc(lastDocId).get();
      if (lastDoc.exists) {
        castingQuery = castingQuery.startAfter(lastDoc);
      }
    }

    castingQuery = castingQuery.limit(limitVal);

    const snapshot = await castingQuery.get();
    const calls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(calls);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch casting calls';
    res.status(500).json({ error: message });
  }
});

app.post('/api/casting', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = CastingCallSchema.parse(req.body);
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const { id, ...dataToSave } = validatedData;

    if (id) {
      // SECURITY FIX: Verify ownership before overwriting existing casting call
      const existingDoc = await db.collection('casting_calls').doc(id).get();
      if (existingDoc.exists && existingDoc.data()?.createdBy !== uid) {
        res.status(403).json({ error: 'Forbidden: You do not own this casting call' });
        return;
      }
      await db.collection('casting_calls').doc(id).set({
        ...dataToSave,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: uid,
        status: 'Open',
      });
      res.json({ id });
    } else {
      const docRef = await db.collection('casting_calls').add({
        ...dataToSave,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: uid,
        status: 'Open',
      });
      res.json({ id: docRef.id });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create casting call';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/casting/:id', verifyToken, isAdmin, async (req: AuthedRequest<{ id: string }>, res: Response) => {
  try {
    await db.collection('casting_calls').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete casting call';
    res.status(500).json({ error: message });
  }
});

app.put('/api/casting/:id/priority', verifyToken, isAdmin, async (req: AuthedRequest<{ id: string }>, res: Response) => {
  try {
    const { highPriority } = req.body as any;
    await db.collection('casting_calls').doc(req.params.id).update({
      highPriority: !!highPriority,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set casting priority';
    res.status(500).json({ error: message });
  }
});

const ConversationSchema = z.object({
  participants: z.array(z.string()).min(2),
  initialMessage: z.string().optional(),
});

app.post('/api/messaging/conversations', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { participants, initialMessage } = ConversationSchema.parse(req.body);
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const uniqueParticipants = Array.from(new Set(participants));
    if (!uniqueParticipants.includes(uid)) {
      res.status(400).json({ error: "Conversation must include the authenticated user" });
      return;
    }

    const sorted = uniqueParticipants.slice().sort();

    // Check if conversation already exists
    const snapshot = await db.collection('conversations')
      .where('participants', 'array-contains', uid)
      .get();

    const existing = snapshot.docs.find((doc) => {
      const p = doc.data().participants;
      if (!Array.isArray(p) || p.length !== sorted.length) {
        return false;
      }
      const normalized = [...p].sort();
      return normalized.every((item, index) => item === sorted[index]);
    });

    if (existing) {
      res.json({ id: existing.id });
      return;
    }

    const docRef = await db.collection('conversations').add({
      participants: sorted,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send a new conversation notification to the other participant
    const otherParticipantId = sorted.find((p) => p !== uid);
    if (otherParticipantId) {
      const user = req.user!;
      let senderName = (user as any).name || "Someone";
      let senderAvatar = (user as any).picture || "";

      try {
        const profileSnap = await db.collection('profiles').doc(uid).get();
        if (profileSnap.exists) {
          const pData = profileSnap.data();
          senderName = pData?.name || [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') || pData?.username || senderName;
          senderAvatar = pData?.image || pData?.photoURL || pData?.avatar || senderAvatar;
        }
      } catch (e) {
        console.warn("Error fetching profile for new convo notification:", e);
      }

      await db.collection('notifications').add({
        userId: otherParticipantId,
        recipientId: otherParticipantId,
        receiverId: otherParticipantId,
        senderId: uid,
        senderName,
        senderAvatar,
        title: "New Conversation",
        body: `${senderName} started a new conversation with you.`,
        type: "messages",
        notificationType: "messages",
        isRead: false,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        targetUrl: `/messages/${uid}`,
        profileUrl: `/messages/${uid}`,
        pushSent: true
      });

      const tokenDoc = await db.collection('users').doc(otherParticipantId).collection('private').doc('settings').get();
      const allTokens: string[] = [];
      if (tokenDoc.exists) {
        const data = tokenDoc.data();
        if (data?.fcmTokens && Array.isArray(data.fcmTokens)) {
          allTokens.push(...data.fcmTokens);
        }
      }

      if (allTokens.length > 0) {
        const messagePayload = {
          notification: {
            title: 'New Conversation',
            body: `${senderName} started a new conversation with you.`,
            icon: '/logo.png',
          },
          data: {
            link: `/messages/${uid}`,
          },
          tokens: allTokens,
        };

        admin.messaging().sendEachForMulticast(messagePayload)
          .then(response => {
            console.log(`${response.successCount} conversation notifications were sent successfully`);
          })
          .catch(err => {
            console.error('Failed to send multicast conversation notifications:', err);
          });
      }

      // Also send via OneSignal push notification
      sendOneSignalNotification({
        userIds: [otherParticipantId],
        title: 'New Conversation',
        body: `${senderName} started a new conversation with you.`,
        url: `/messages/${uid}`
      });
    }

    if (initialMessage) {
      const newMessage = {
        senderId: 'system',
        text: initialMessage,
        isSystem: true,
        type: 'text',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('conversations').doc(docRef.id).collection('messages').add(newMessage);
      await db.collection('conversations').doc(docRef.id).update({
        lastMessage: initialMessage,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        unread: true,
        lastSenderId: 'system',
      });
    }

    res.json({ id: docRef.id });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    res.status(500).json({ error: message });
  }
});

app.get('/api/messaging/conversations', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const snapshot = await db.collection('conversations')
      .where('participants', 'array-contains', uid)
      .get();
    const convos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(convos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/messaging/:conversationId', verifyToken, async (req: AuthedRequest<{ conversationId: string }>, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }
    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const convoData = convo.data();
    if (convoData?.createdBy === uid) {
      await convo.ref.delete();
    } else {
      await convo.ref.update({
        [`deletedFor.${uid}`]: true
      });
    }
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    res.status(500).json({ error: message });
  }
});

app.get(
  '/api/messaging/:conversationId/messages',
  verifyToken,
  async (req: AuthedRequest<{ conversationId: string }>, res: Response) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).send('Unauthorized');
        return;
      }

      const convoDoc = await db.collection('conversations').doc(req.params.conversationId).get();
      const participants = convoDoc.data()?.participants;
      if (!convoDoc.exists || !Array.isArray(participants) || !participants.includes(uid)) {
        res.status(403).send('Forbidden: Not a participant');
        return;
      }

      const snapshot = await db.collection('conversations')
        .doc(req.params.conversationId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .get();
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(msgs);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch messages';
      res.status(500).json({ error: message });
    }
  },
);

app.post(
  '/api/messaging/:conversationId/messages',
  verifyToken,
  messageWriteLimiter,
  async (req: AuthedRequest<{ conversationId: string }>, res: Response) => {
    try {
      const validatedData = MessageSchema.parse(req.body);
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).send('Unauthorized');
        return;
      }

      const convoDoc = await db.collection('conversations').doc(req.params.conversationId).get();
      const participants = convoDoc.data()?.participants;
      if (!convoDoc.exists || !Array.isArray(participants) || !participants.includes(uid)) {
        res.status(403).send('Forbidden: Not a participant');
        return;
      }

      const isSystem = validatedData.isSystem || uid === 'system';
      const newMessage = {
        senderId: isSystem ? 'system' : uid,
        text: validatedData.text,
        type: validatedData.type,
        isSystem,
        replyTo: validatedData.replyTo || null,
        reactions: {},
        read: false,
        delivered: false,
        clientMsgId: validatedData.clientMsgId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('conversations')
        .doc(req.params.conversationId)
        .collection('messages')
        .add(newMessage);

      // Update conversation metadata
      const convoUpdate: any = {
        lastMessage: validatedData.text,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        unread: true,
        lastSenderId: isSystem ? 'system' : uid,
        lastMessageDelivered: false,
        lastMessageRead: false,
      };

      // SECURITY & PERFORMANCE FIX: Use atomic FieldValue.increment and dot notation to prevent race conditions
      convoUpdate[`readBy.${uid}`] = true;
      convoUpdate[`unreadCounts.${uid}`] = 0;

      participants.forEach((pId: string) => {
        if (pId !== uid) {
          convoUpdate[`readBy.${pId}`] = false;
          convoUpdate[`unreadCounts.${pId}`] = admin.firestore.FieldValue.increment(1);
        }
      });

      await db.collection('conversations')
        .doc(req.params.conversationId)
        .update(convoUpdate);

      // Trigger FCM to participants (except sender)
      const otherParticipants = participants.filter((p: string) => p !== uid);
      if (otherParticipants.length > 0) {
        // Send notifications document in firestore for each recipient
        for (const otherParticipantId of otherParticipants) {
          const user = req.user!;
          let senderName = (user as any).name || "Someone";
          let senderAvatar = (user as any).picture || "";

          try {
            const profileSnap = await db.collection('profiles').doc(uid).get();
            if (profileSnap.exists) {
              const pData = profileSnap.data();
              senderName = pData?.name || [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') || pData?.username || senderName;
              senderAvatar = pData?.image || pData?.photoURL || pData?.avatar || senderAvatar;
            }
          } catch (e) {
            console.warn("Error fetching profile for notification:", e);
          }

          let title = "New Message";
          let body = validatedData.text;
          if (validatedData.type === "image") {
            title = "Media received";
            body = "Sent an image";
          } else if (validatedData.type === "video") {
            title = "Media received";
            body = "Sent a video";
          }

          await db.collection('notifications').add({
            userId: otherParticipantId,
            recipientId: otherParticipantId,
            receiverId: otherParticipantId,
            senderId: uid,
            senderName,
            senderAvatar,
            title,
            body,
            type: "messages",
            notificationType: "messages",
            isRead: false,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            targetUrl: `/messages/${uid}`,
            profileUrl: `/messages/${uid}`,
            pushSent: true
          });
        }

        const allTokens: string[] = [];
        await Promise.all(otherParticipants.map(async (pId) => {
          const tokenDoc = await db.collection('users').doc(pId).collection('private').doc('settings').get();
          if (tokenDoc.exists) {
            const data = tokenDoc.data();
            if (data?.fcmTokens && Array.isArray(data.fcmTokens)) {
              allTokens.push(...data.fcmTokens);
            }
          }
        }));

        if (allTokens.length > 0) {
          const preview = formatMessagePreview(validatedData.text);
          const messagePayload = {
            notification: {
              title: 'New Message',
              body: preview.length > 50 ? `${preview.substring(0, 47)}...` : preview,
              icon: '/logo.png',
            },
            data: {
              link: `/messages/${req.params.conversationId}`,
            },
            tokens: allTokens,
          };

          admin.messaging().sendEachForMulticast(messagePayload)
            .then(response => {
              console.log(`${response.successCount} messages were sent successfully`);
            })
            .catch(err => {
              console.error('Failed to send multicast notifications:', err);
            });
        }

        // Also send via OneSignal push notification
        const preview = formatMessagePreview(validatedData.text);
        sendOneSignalNotification({
          userIds: otherParticipants,
          title: 'New Message',
          body: preview.length > 50 ? `${preview.substring(0, 47)}...` : preview,
          url: `/messages/${req.params.conversationId}`
        });
      }

      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error in POST /api/messaging/:conversationId/messages:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to send message';
      res.status(500).json({ error: message });
    }
  },
);

app.put('/api/messaging/:conversationId/messages/:messageId', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const { text } = req.body as any;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).send('Message text is required');
      return;
    }
    if (text.length > 2000) {
      res.status(400).send('Message text exceeds 2000 characters');
      return;
    }
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const msg = await assertMessageOwner(req.params.conversationId, req.params.messageId, uid, res);
    if (!msg) return;

    await msg.ref.update({
      text,
      edited: true,
      editedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update message';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/messaging/:conversationId/messages/:messageId', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const msg = await assertMessageOwner(req.params.conversationId, req.params.messageId, uid, res);
    if (!msg) return;

    await msg.ref.update({
      text: '',
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    res.status(500).json({ error: message });
  }
});

app.post('/api/messaging/:conversationId/messages/:messageId/react', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const { emoji } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }
    if (!emoji) {
      res.status(400).send('Emoji is required');
      return;
    }

    const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      res.status(400).send('Invalid emoji');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const messageRef = db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      res.status(404).send('Message not found');
      return;
    }

    await messageRef.update({
      [`reactions.${uid}`]: emoji,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to react to message';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/messaging/:conversationId/messages/:messageId/react', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const messageRef = db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      res.status(404).send('Message not found');
      return;
    }

    await messageRef.update({
      [`reactions.${uid}`]: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove reaction';
    res.status(500).json({ error: message });
  }
});

app.put('/api/messaging/:conversationId/messages/:messageId/pin', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const { pinned } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    const messageRef = db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      res.status(404).send('Message not found');
      return;
    }

    const shouldPin = !!pinned;

    await messageRef.update({
      pinned: shouldPin,
      pinnedBy: shouldPin ? uid : null,
      pinnedAt: shouldPin ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to pin message';
    res.status(500).json({ error: message });
  }
});

app.put('/api/messaging/:conversationId/read', verifyToken, async (req: AuthedRequest<{ conversationId: string }>, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const convo = await assertParticipant(req.params.conversationId, uid, res);
    if (!convo) return;

    // SECURITY FIX: Use correct field name 'unreadCounts' (with 's') to match message send code
    await db.collection('conversations')
      .doc(req.params.conversationId)
      .update({
        [`unreadCounts.${uid}`]: 0,
        [`readBy.${uid}`]: true,
        [`lastReadAt.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
      });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark conversation as read';
    res.status(500).json({ error: message });
  }
});

app.post('/api/users/block', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { targetId } = req.body as any;
    const uid = req.user?.uid;
    if (!uid || !targetId) {
      res.status(400).send('User ID and target ID are required');
      return;
    }
    if (uid === targetId) {
      res.status(400).send('Cannot block yourself');
      return;
    }

    await db.collection('users').doc(uid).set({
      blockedUsers: admin.firestore.FieldValue.arrayUnion(targetId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to block user';
    res.status(500).json({ error: message });
  }
});

app.post('/api/notifications/register-token', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { token } = NotificationTokenSchema.parse(req.body);
    if (!token || !req.user) {
      res.status(400).send('Missing token or user');
      return;
    }

    const privateSettingsRef = db.collection('users').doc(req.user.uid).collection('private').doc('settings');
    await db.runTransaction(async (transaction) => {
      const settingsSnapshot = await transaction.get(privateSettingsRef);
      const existingRaw = settingsSnapshot.data()?.fcmTokens;
      const existingTokens = Array.isArray(existingRaw)
        ? existingRaw.filter((item): item is string => typeof item === 'string')
        : [];

      if (existingTokens.includes(token)) {
        return;
      }

      if (existingTokens.length >= MAX_FCM_TOKENS) {
        throw new Error(FCM_TOKEN_LIMIT_REACHED);
      }

      transaction.set(privateSettingsRef, {
        fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
      }, { merge: true });
    });

    res.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    if (error instanceof Error && error.message === FCM_TOKEN_LIMIT_REACHED) {
      res.status(400).json({ error: `FCM token limit reached (${MAX_FCM_TOKENS})` });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to register token';
    res.status(500).json({ error: message });
  }
});

app.get('/api/notifications/unread-count', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    // 1. Get user profile and last check timestamp
    const profileDoc = await db.collection('profiles').doc(uid).get();
    const profileData = profileDoc.data();
    const lastCheckedAt = profileData?.lastCheckedAt || new admin.firestore.Timestamp(0, 0);
    const userSkills = profileData?.skills || [];

    // 2. Count new messages in conversations
    const conversationsSnapshot = await db.collection('conversations')
      .where('participants', 'array-contains', uid)
      .get();

    let unreadMessages = 0;
    
    // We check each conversation for messages since lastCheckedAt
    const messagePromises = conversationsSnapshot.docs.map(convo => 
      db.collection('conversations')
        .doc(convo.id)
        .collection('messages')
        .where('createdAt', '>', lastCheckedAt)
        .where('senderId', '!=', uid)
        .get()
    );

    const messageSnapshots = await Promise.all(messagePromises);
    messageSnapshots.forEach(snap => {
      unreadMessages += snap.size;
    });

    // 3. Count new matching casting calls
    let castingSnapshot = await db.collection('casting_calls')
      .where('createdAt', '>', lastCheckedAt)
      .get();
    
    let newCastingCalls = 0;

    if (userSkills.length > 0) {
      newCastingCalls = castingSnapshot.docs.filter(doc => {
        const data = doc.data();
        // Match based on category/type
        return userSkills.some((skill: any) => 
          (typeof skill === 'string' && skill.toLowerCase() === data.type?.toLowerCase()) ||
          (data.skills && Array.isArray(data.skills) && data.skills.includes(skill))
        );
      }).length;
    } else {
      newCastingCalls = castingSnapshot.size;
    }

    res.json({
      unreadMessages,
      newCastingCalls,
      total: unreadMessages + newCastingCalls,
      lastCheckedAt: lastCheckedAt.toDate().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch unread count';
    res.status(500).json({ error: message });
  }
});

app.post('/api/notifications/mark-as-read', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    await db.collection('profiles').doc(uid).set({
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update checked status';
    res.status(500).json({ error: message });
  }
});

// Helper function to verify credentials via Firebase REST API
const verifyCredentials = async (email: string, password: string): Promise<boolean> => {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("VITE_FIREBASE_API_KEY environment variable is not defined");
    return false;
  }
  
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    return res.status === 200;
  } catch (error) {
    console.error("Credentials verification failed:", error);
    return false;
  }
};

// ─── SEND SETUP OTP ───────────────────
app.post('/api/2fa/send-setup-otp', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).send('Unauthorized');
      return;
    }
    const { method, phone, email } = req.body as any; // 'email' or 'sms'

    // Rate limiting — prevent OTP spam
    const existingOTP = await db.collection('otpCodes').doc(userId).get();
    if (existingOTP.exists) {
      const existingData = existingOTP.data();
      if (existingData?.createdAt) {
        const timeSinceLastOTP = Date.now() - existingData.createdAt.toMillis();
        if (timeSinceLastOTP < 60 * 1000) { // 60 second cooldown
          res.status(429).json({
            error: 'Please wait before requesting another code',
            waitSeconds: Math.ceil((60000 - timeSinceLastOTP) / 1000),
          });
          return;
        }
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash it before storing — never store plain OTP
    const hashedCode = await bcrypt.hash(code, 10);

    // Store hashed OTP in Firestore with expiry
    await db.collection('otpCodes').doc(userId).set({
      hashedCode,
      method,
      phone: phone || null,
      email: email || null,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get user data to find email/phone
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const targetEmail = email || userData.email || '';
    const targetPhone = phone || userData.phone || '';

    // Send code via email or SMS — NEVER in response
    if (method === 'email') {
      await sendOTPEmail(targetEmail, code);
    } else if (method === 'sms') {
      await sendOTPSMS(targetPhone, code);
    }

    // Local debug print (safe console-only, never sent to client)
    // SECURITY FIX: Never log OTP codes — log only that an OTP was sent
    console.log(`[2FA OTP Setup] Method: ${method}, Destination: ${method === 'email' ? targetEmail : targetPhone}, OTP sent successfully`);

    res.json({
      success: true,
      method,
      destination: maskDestination(method, targetPhone, targetEmail),
      expiresIn: 600, // seconds
    });
  } catch (error: unknown) {
    console.error('Send setup OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send verification code';
    res.status(500).json({ error: message });
  }
});

// ─── SEND LOGIN OTP ───────────────────
app.post('/api/2fa/send-login-otp', async (req: Request, res: Response) => {
  try {
    const { email, password, method } = req.body;

    // Verify credentials first (password auth)
    const valid = await verifyCredentials(email, password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Fetch user
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    // Verify 2FA is actually enabled for this user
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    
    // SECURITY FIX: Read 2FA settings from private settings document
    const privateSettingsDoc = await db.collection('users').doc(userId).collection('private').doc('settings').get();
    const privateSettingsData = privateSettingsDoc.data() || {};

    const twoFactorEnabled = userData.twoFactorEnabled || privateSettingsData.twoFactorEnabled;
    if (!twoFactorEnabled) {
      res.status(400).json({ error: '2FA not enabled for this account' });
      return;
    }

    const twoFactorMethod = method || privateSettingsData.twoFactorMethod || userData.twoFactorMethod || 'sms';
    const targetEmail = privateSettingsData.twoFactorEmail || userData.email || email;
    const targetPhone = privateSettingsData.twoFactorPhone || userData.phone || '';

    // Rate limiting — prevent OTP spam
    const existingOTP = await db.collection('otpCodes').doc(userId).get();
    if (existingOTP.exists) {
      const existingData = existingOTP.data();
      if (existingData?.createdAt) {
        const timeSinceLastOTP = Date.now() - existingData.createdAt.toMillis();
        if (timeSinceLastOTP < 60 * 1000) { // 60 second cooldown
          res.status(429).json({
            error: 'Please wait before requesting another code',
            waitSeconds: Math.ceil((60000 - timeSinceLastOTP) / 1000),
          });
          return;
        }
      }
    }

    // Generate and hash OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    // Store hashed OTP
    await db.collection('otpCodes').doc(userId).set({
      hashedCode,
      method: twoFactorMethod,
      phone: targetPhone || null,
      email: targetEmail || null,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send via email or SMS only
    if (twoFactorMethod === 'email') {
      await sendOTPEmail(targetEmail, code);
    } else {
      await sendOTPSMS(targetPhone, code);
    }

    // Local debug print (safe console-only, never sent to client)
    // SECURITY FIX: Never log OTP codes — log only that an OTP was sent
    console.log(`[2FA OTP Login] Method: ${twoFactorMethod}, Destination: ${twoFactorMethod === 'email' ? targetEmail : targetPhone}, OTP sent successfully`);

    res.json({
      success: true,
      method: twoFactorMethod,
      destination: maskDestination(twoFactorMethod, targetPhone, targetEmail),
    });
  } catch (error: unknown) {
    console.error('Send login OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send verification code';
    res.status(500).json({ error: message });
  }
});

// ─── VERIFY OTP (NEW MERGED ENDPOINT) ───
// SECURITY FIX: Require authentication to prevent arbitrary userId submission
app.post('/api/2fa/verify-otp', verifyToken, async (req: AuthedRequest<any, any>, res: Response) => {
  try {
    // SECURITY FIX: Use authenticated user's UID instead of client-supplied userId
    const userId = req.user?.uid;
    const { code } = req.body;

    if (!userId || !code) {
      res.status(400).json({ error: 'Missing authentication or code' });
      return;
    }

    // Backup code check (8 digits)
    if (code.toString().length === 8) {
      const privateSettingsRef = db.collection('users').doc(userId).collection('private').doc('settings');
      const privateSettingsDoc = await privateSettingsRef.get();
      if (privateSettingsDoc.exists) {
        const backupCodes = privateSettingsDoc.data()?.twoFactorBackupCodes || [];
        if (backupCodes.includes(code.toString())) {
          // Remove used code
          const updatedBackupCodes = backupCodes.filter((c: string) => c !== code.toString());
          await privateSettingsRef.set({
            twoFactorBackupCodes: updatedBackupCodes
          }, { merge: true });

          // Reset attempts
          await db.collection('two_factor_attempts').doc(userId).delete();

          const customToken = await admin.auth().createCustomToken(userId, {
            twoFactorVerified: true,
          });

          res.json({
            success: true,
            verified: true,
            customToken,
          });
          return;
        }
      }
      res.status(400).json({ error: 'Invalid backup code.' });
      return;
    }

    const otpDoc = await db.collection('otpCodes').doc(userId).get();
    if (!otpDoc.exists) {
      res.status(400).json({ error: 'No verification code found. Request a new one.' });
      return;
    }

    const otpData = otpDoc.data() || {};

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await db.collection('otpCodes').doc(userId).delete();
      res.status(400).json({ error: 'Code expired. Please request a new one.' });
      return;
    }

    // Check max attempts — brute force protection
    if (otpData.attempts >= 3) {
      await db.collection('otpCodes').doc(userId).delete();
      res.status(429).json({
        error: 'Too many failed attempts. Please request a new code.',
      });
      return;
    }

    // Verify code against hash
    const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);
    if (!isValid) {
      // Increment failed attempt counter
      await db.collection('otpCodes').doc(userId).update({
        attempts: otpData.attempts + 1,
      });
      const remaining = 2 - otpData.attempts;
      res.status(400).json({
        error: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
      return;
    }

    // Code is valid — delete it immediately (one-time use)
    await db.collection('otpCodes').doc(userId).delete();

    // If this is login 2FA, generate a custom token for the client
    const customToken = await admin.auth().createCustomToken(userId, {
      twoFactorVerified: true,
    });

    res.json({
      success: true,
      verified: true,
      customToken, // client uses this to complete sign-in
    });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    res.status(500).json({ error: message });
  }
});

// ─── VERIFY SETUP OTP (BACKWARDS COMPATIBILITY) ───
app.post('/api/2fa/verify-setup-otp', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { code, method, phone, email } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const otpDoc = await db.collection('otpCodes').doc(uid).get();
    if (!otpDoc.exists) {
      res.status(400).json({ error: 'No verification code found. Please request one.' });
      return;
    }

    const otpData = otpDoc.data() || {};
    const isExpired = Date.now() > otpData.expiresAt;
    const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);

    if (!isValid || isExpired) {
      res.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }

    // Generate 8 backup codes (8 digits each)
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(10000000 + Math.random() * 90000000).toString()
    );

    // SECURITY FIX: Save configuration to private settings
    await db.collection('users').doc(uid).collection('private').doc('settings').set({
      twoFactorEnabled: true,
      twoFactorMethod: method,
      twoFactorPhone: phone || null,
      twoFactorEmail: email || null,
      twoFactorBackupCodes: backupCodes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Sync to users
    await db.collection('users').doc(uid).set({
      twoFactorEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Clean up OTP
    await db.collection('otpCodes').doc(uid).delete();

    res.json({ success: true, backupCodes });
  } catch (error: unknown) {
    console.error('Verify setup OTP compatibility error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify setup OTP';
    res.status(500).json({ error: message });
  }
});

// ─── VERIFY LOGIN OTP (BACKWARDS COMPATIBILITY) ───
app.post('/api/2fa/verify-login-otp', async (req: Request, res: Response) => {
  try {
    const { email, password, code, useBackupCode } = req.body;

    // SECURITY FIX: Re-verify password alongside OTP to prevent blind brute-force
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const credentialsValid = await verifyCredentials(email, password);
    if (!credentialsValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    // Check Lockout
    const attemptsDoc = await db.collection('two_factor_attempts').doc(uid).get();
    let currentAttempts = 0;
    if (attemptsDoc.exists) {
      const data = attemptsDoc.data();
      if (data?.lockedUntil && new Date() < data.lockedUntil.toDate()) {
        res.status(403).json({ error: 'Account is locked. Try again later.' });
        return;
      }
      currentAttempts = data?.attempts || 0;
    }

    if (useBackupCode) {
      const privateSettingsRef = db.collection('users').doc(uid).collection('private').doc('settings');
      const privateSettingsDoc = await privateSettingsRef.get();
      const backupCodes = privateSettingsDoc.data()?.twoFactorBackupCodes || [];
      
      if (backupCodes.includes(code)) {
        // Remove code from array
        const updatedBackupCodes = backupCodes.filter((c: string) => c !== code);
        await privateSettingsRef.set({
          twoFactorBackupCodes: updatedBackupCodes
        }, { merge: true });

        // Reset attempts
        await db.collection('two_factor_attempts').doc(uid).delete();
        res.json({ success: true });
        return;
      }
    } else {
      const otpDoc = await db.collection('otpCodes').doc(uid).get();
      if (otpDoc.exists) {
        const otpData = otpDoc.data() || {};
        const isExpired = Date.now() > otpData.expiresAt;
        const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);
        if (isValid && !isExpired) {
          // Success
          await db.collection('otpCodes').doc(uid).delete();
          await db.collection('two_factor_attempts').doc(uid).delete();
          res.json({ success: true });
          return;
        }
      }
    }

    // Invalid code -> track attempts
    currentAttempts += 1;
    if (currentAttempts >= 3) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      await db.collection('two_factor_attempts').doc(uid).set({
        attempts: currentAttempts,
        lockedUntil,
      });
      res.status(400).json({ error: 'Invalid code. Too many failed attempts. Account locked for 15 minutes.' });
    } else {
      await db.collection('two_factor_attempts').doc(uid).set({
        attempts: currentAttempts,
        lockedUntil: null,
      });
      res.status(400).json({ error: `Invalid code. ${3 - currentAttempts} attempts remaining.` });
    }
  } catch (error: unknown) {
    console.error('Verify login OTP compatibility error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify login OTP';
    res.status(500).json({ error: message });
  }
});

// ─── ENABLE 2FA AFTER SETUP ───────────
app.post('/api/2fa/enable', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).send('Unauthorized');
      return;
    }
    const { method, verificationCode } = req.body as any;

    // Verify the setup code first
    const otpDoc = await db.collection('otpCodes').doc(userId).get();
    if (!otpDoc.exists) {
      res.status(400).json({ error: 'No pending verification found' });
      return;
    }

    const otpData = otpDoc.data() || {};
    if (Date.now() > otpData.expiresAt) {
      res.status(400).json({ error: 'Verification code expired' });
      return;
    }

    const isValid = await bcrypt.compare(
      verificationCode.toString(),
      otpData.hashedCode
    );

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Clean up OTP
    await db.collection('otpCodes').doc(userId).delete();

    // Enable 2FA on user's private settings
    await db.collection('users').doc(userId).collection('private').doc('settings').set({
      twoFactorEnabled: true,
      twoFactorMethod: method,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      twoFactorEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error: unknown) {
    console.error('Enable 2FA error:', error);
    const message = error instanceof Error ? error.message : 'Failed to enable 2FA';
    res.status(500).json({ error: message });
  }
});

// ─── DISABLE 2FA ──────────────────────
app.post('/api/2fa/disable', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).send('Unauthorized');
      return;
    }

    // SECURITY FIX: Disable 2FA in private settings
    await db.collection('users').doc(userId).collection('private').doc('settings').set({
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorPhone: null,
      twoFactorEmail: null,
      twoFactorBackupCodes: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      twoFactorEnabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true, message: '2FA disabled' });
  } catch (error: unknown) {
    console.error('Disable 2FA error:', error);
    const message = error instanceof Error ? error.message : 'Failed to disable 2FA';
    res.status(500).json({ error: message });
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', error);
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof Error && (error.message === 'Only image uploads are allowed' || error.message === 'Only image and video uploads are allowed')) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues });
    return;
  }
  // SECURITY FIX: Never expose internal error details to the client
  console.error('[Unhandled Error Detail]:', error instanceof Error ? error.message : error);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});

const startupTime = admin.firestore.Timestamp.now();

function startFirestoreListeners() {
  console.log("🔥 Starting background Firestore listeners for Push Notifications...");

  // 1. Listen to new notifications in Firestore
  db.collection('notifications')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const notif = change.doc.data();

          if (notif.pushSent === true || notif.read === true || notif.isRead === true) return;

          try {
            const recipientId = notif.recipientId || notif.userId || notif.receiverId;
            if (!recipientId) return;

            const settingsDoc = await db.collection('users').doc(recipientId).collection('private').doc('settings').get();
            const fcmTokens = settingsDoc.data()?.fcmTokens;

            if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
              const payload = {
                notification: {
                  title: notif.title || 'New Notification',
                  body: notif.body || '',
                  icon: notif.senderAvatar || '/logo.png',
                },
                data: {
                  link: notif.targetUrl || '/',
                },
                tokens: fcmTokens,
              };

              const response = await admin.messaging().sendEachForMulticast(payload);
              console.log(`[Push Notification] Sent ${response.successCount} pushes for notification ${docId}`);
            }

            // Mark as pushSent: true in the database
            await db.collection('notifications').doc(docId).update({ pushSent: true });
          } catch (err) {
            console.error(`[Push Notification] Error sending for notification ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Push Notification] Notifications listener error:", error);
    });

  // 2. Listen to new calls in Firestore
  db.collection('calls')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const call = change.doc.data();

          if (call.status !== 'pending' && call.callStatus !== 'pending') return;

          try {
            const calleeId = call.calleeId;
            if (!calleeId) return;

            const settingsDoc = await db.collection('users').doc(calleeId).collection('private').doc('settings').get();
            const fcmTokens = settingsDoc.data()?.fcmTokens;

            if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
              const payload = {
                data: {
                  type: 'incoming_call',
                  callId: docId,
                  callerName: call.callerName || 'Someone',
                  callerAvatar: call.callerPhoto || call.callerAvatar || '/logo.png',
                  callType: call.callType || 'audio',
                  link: `/call/${docId}`,
                },
                tokens: fcmTokens,
              };

              const response = await admin.messaging().sendEachForMulticast(payload);
              console.log(`[Call Push] Sent ${response.successCount} call alert pushes for call ${docId}`);
            }
          } catch (err) {
            console.error(`[Call Push] Error sending alert for call ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Call Push] Calls listener error:", error);
    });

  // 3. Listen to new casting calls in Firestore
  db.collection('casting_calls')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const casting = change.doc.data();

          try {
            const castingType = casting.type;
            if (!castingType) return;

            // Query profiles to find matching role category or skills
            const profilesSnap = await db.collection('profiles').get();
            const matchingProfiles = profilesSnap.docs.filter(doc => {
              const data = doc.data();
              const userSkills = data.skills || [];
              const userRole = data.role || "";

              const roleMatches = typeof userRole === 'string' && userRole.toLowerCase() === castingType.toLowerCase();
              const skillMatches = Array.isArray(userSkills) && userSkills.some((skill: any) =>
                typeof skill === 'string' && skill.toLowerCase() === castingType.toLowerCase()
              );

              return roleMatches || skillMatches;
            });

            console.log(`[Casting Alert] Found ${matchingProfiles.length} matching profiles for casting type "${castingType}"`);

            for (const profileDoc of matchingProfiles) {
              const recipientId = profileDoc.id;
              if (recipientId === casting.createdBy) continue; // Don't notify the creator

              // Write a notification document to Firestore
              await db.collection('notifications').add({
                userId: recipientId,
                recipientId: recipientId,
                receiverId: recipientId,
                senderId: casting.createdBy || 'system',
                senderName: casting.creatorName || casting.production || 'NC Network',
                senderAvatar: casting.thumbnail || '/logo.png',
                title: 'Matching Casting Call',
                body: `New ${castingType} casting call: "${casting.title}" in ${casting.location}`,
                type: 'casting',
                notificationType: 'casting',
                isRead: false,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                targetUrl: `/casting/${docId}`,
                profileUrl: `/casting/${docId}`,
              });
            }
          } catch (err) {
            console.error(`[Casting Alert] Error creating notifications for casting call ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Casting Alert] Casting calls listener error:", error);
    });
}

// ─── Data Export Endpoints ───────────────────────────────────────────────────────

// 1. Admin Approve request: generate secure random token, store in one_time_tokens, send email with link
app.post('/api/admin/data-export/approve', verifyToken, isAdmin, async (req: AuthedRequest<any, any>, res: Response) => {
  try {
    const { requestId } = req.body;
    if (!requestId || typeof requestId !== 'string') {
      res.status(400).send('Bad Request: Missing requestId');
      return;
    }

    const requestRef = db.collection('data_export_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      res.status(404).send('Not Found: Request not found');
      return;
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== 'pending') {
      res.status(400).send('Bad Request: Request is not in pending status');
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    // Store secure one-time token
    await db.collection('one_time_tokens').doc(token).set({
      uid: requestData.uid,
      email: requestData.email,
      requestId: requestId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt,
      used: false,
    });

    // Update data request status
    await requestRef.update({
      status: 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email with secure tokenized link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const downloadLink = `${frontendUrl}/api/data-export/download?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NC Network Security" <${process.env.EMAIL_USER}>`,
      to: requestData.email,
      subject: 'Your Data Archive is Ready for Download',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #0b0b0c; color: #fff;">
          <h2 style="color: #FFD700;">NC Network</h2>
          <p style="color: #ccc;">Your request to download your account data has been approved.</p>
          <p style="color: #ccc;">You can download your archive by clicking the button below. This link is valid for <strong>24 hours</strong> and can only be used <strong>once</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadLink}" style="background-color: #00BFFF; color: #000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              Download Data Archive
            </a>
          </div>
          <p style="color: #999; font-size: 11px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${downloadLink}" style="color: #00BFFF;">${downloadLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;"/>
          <p style="color: #666; font-size: 11px;">
            If you did not request this data export, please contact support and update your security settings immediately.
          </p>
        </div>
      `,
    });

    res.send({ success: true });
  } catch (error: any) {
    console.error('Data export approval error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 2. Download endpoint (Public link, authenticated via token query parameter)
app.get('/api/data-export/download', async (req: Request, res: Response) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      res.status(400).send('Bad Request: Missing secure token');
      return;
    }

    const tokenRef = db.collection('one_time_tokens').doc(token);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      res.status(403).send('Forbidden: Invalid secure token');
      return;
    }

    const tokenData = tokenDoc.data();
    if (!tokenData) {
      res.status(403).send('Forbidden: Invalid secure token data');
      return;
    }

    if (tokenData.used === true) {
      res.status(403).send('Forbidden: Token has already been used');
      return;
    }

    if (tokenData.expiresAt < Date.now()) {
      res.status(403).send('Forbidden: Token has expired');
      return;
    }

    // Invalidate token immediately to guarantee single use
    await tokenRef.update({ used: true });

    const uid = tokenData.uid;

    // Fetch Profile
    const profileDoc = await db.collection('profiles').doc(uid).get();
    const profileData = profileDoc.exists ? { id: uid, ...profileDoc.data() } : null;

    // Fetch Conversations & Messages
    const convoSnap = await db.collection('conversations')
      .where('participants', 'array-contains', uid)
      .get();

    const conversationsData = [];
    for (const convoDoc of convoSnap.docs) {
      const convoData = convoDoc.data();
      const messagesSnap = await convoDoc.ref.collection('messages')
        .orderBy('createdAt', 'asc')
        .get();

      const messages = messagesSnap.docs.map((mDoc) => {
        const mData = mDoc.data();
        return {
          id: mDoc.id,
          senderId: mData.senderId,
          text: mData.text,
          isSystem: mData.isSystem || false,
          type: mData.type || 'text',
          createdAt: mData.createdAt?.toDate?.()?.toISOString() || mData.createdAt || null,
        };
      });

      conversationsData.push({
        id: convoDoc.id,
        participants: convoData.participants,
        lastMessage: convoData.lastMessage,
        messages,
      });
    }

    const archive = {
      exportedAt: new Date().toISOString(),
      userId: uid,
      userEmail: tokenData.email,
      profile: profileData,
      conversations: conversationsData,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="nc-data-archive-${uid}-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(archive, null, 2));
  } catch (error: any) {
    console.error('Data export download error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`NC Network Secure API running on http://localhost:${PORT}`);
  startFirestoreListeners();
});
