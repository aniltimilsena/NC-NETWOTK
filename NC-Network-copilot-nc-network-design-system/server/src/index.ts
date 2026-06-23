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

// Load env from current directory first, then fallback to parent directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

const uploadToCloudinary = (fileBuffer: Buffer, mimeType: string, folder: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const isVideo = mimeType.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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
      reject(new Error('Cloudinary is not configured on the server. Please define VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'));
    }
  });
};

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

app.get('/api/admin/users', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const snapshot = await db.collection('profiles').get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    res.status(500).json({ error: message });
  }
});

app.post('/api/admin/log', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const { action, targetId, details } = req.body as any;
    const adminEmail = req.user?.email || "Unknown Admin";

    await db.collection('admin_logs').add({
      adminEmail,
      action,
      targetId,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to write admin log';
    res.status(500).json({ error: message });
  }
});

app.post('/api/admin/settings', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const settings = req.body as any;
    await db.collection('settings').doc('global').set({
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update global settings';
    res.status(500).json({ error: message });
  }
});

app.get('/api/profile/:uid', verifyToken, async (req: AuthedRequest<{ uid: string }>, res: Response) => {
  try {
    const docRef = await db.collection('profiles').doc(req.params.uid).get();
    if (!docRef.exists) {
      res.status(404).send('Profile not found');
      return;
    }
    res.json(docRef.data());
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

app.get('/api/casting', async (req: Request<{}, unknown, unknown, { filter?: string }>, res: Response) => {
  try {
    const filter = req.query.filter;
    let castingQuery = db.collection('casting_calls').orderBy('createdAt', 'desc');

    if (filter && filter !== 'All' && filter !== 'Saved') {
      castingQuery = castingQuery.where('type', '==', filter);
    }

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

      const tokensSnapshot = await db.collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', [otherParticipantId])
        .get();

      const allTokens: string[] = [];
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          allTokens.push(...data.fcmTokens);
        }
      });

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
    await db.collection('conversations').doc(req.params.conversationId).delete();
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

      // Update readBy map (sender read: true, others: false)
      const readBy: Record<string, boolean> = {};
      participants.forEach((pId: string) => {
        readBy[pId] = pId === uid;
      });
      convoUpdate.readBy = readBy;

      // Update unreadCounts map (increment for others)
      const currentUnreadCounts = convoDoc.data()?.unreadCounts || {};
      const newUnreadCounts: Record<string, number> = {};
      participants.forEach((pId: string) => {
        if (pId === uid) {
          newUnreadCounts[pId] = 0;
        } else {
          newUnreadCounts[pId] = (currentUnreadCounts[pId] || 0) + 1;
        }
      });
      convoUpdate.unreadCounts = newUnreadCounts;

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

        const tokensSnapshot = await db.collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', otherParticipants)
          .get();

        const allTokens: string[] = [];
        tokensSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
            allTokens.push(...data.fcmTokens);
          }
        });

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
    if (!text) {
      res.status(400).send('Message text is required');
      return;
    }
    await db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId)
      .update({
        text,
        isEdited: true,
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
    await db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId)
      .delete();
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
    if (!uid || !emoji) {
      res.status(400).send('User ID and emoji are required');
      return;
    }

    const messageRef = db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      res.status(404).send('Message not found');
      return;
    }

    const messageData = docSnap.data();
    const reactions = { ...(messageData?.reactions ?? {}) };

    // Remove user's existing reaction under any emoji
    Object.keys(reactions).forEach((emojiKey) => {
      reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id: string) => id !== uid);
      if (reactions[emojiKey].length === 0) {
        delete reactions[emojiKey];
      }
    });

    // Add user to the new emoji reaction
    reactions[emoji] = [...(reactions[emoji] ?? []), uid];

    await messageRef.update({
      reactions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to react to message';
    res.status(500).json({ error: message });
  }
});

app.put('/api/messaging/:conversationId/messages/:messageId/pin', verifyToken, async (req: AuthedRequest<{ conversationId: string; messageId: string }>, res: Response) => {
  try {
    const { isPinned } = req.body as any;
    await db.collection('conversations')
      .doc(req.params.conversationId)
      .collection('messages')
      .doc(req.params.messageId)
      .update({
        isPinned: !!isPinned,
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
    await db.collection('conversations')
      .doc(req.params.conversationId)
      .update({
        unread: false,
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

    const userRef = db.collection('users').doc(req.user.uid);
    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const existingRaw = userSnapshot.data()?.fcmTokens;
      const existingTokens = Array.isArray(existingRaw)
        ? existingRaw.filter((item): item is string => typeof item === 'string')
        : [];

      if (existingTokens.includes(token)) {
        return;
      }

      if (existingTokens.length >= MAX_FCM_TOKENS) {
        throw new Error(FCM_TOKEN_LIMIT_REACHED);
      }

      transaction.set(userRef, {
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

// 2FA Setup Send Code
app.post('/api/2fa/send-setup-otp', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { method, phone, email } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.collection('two_factor_otps').doc(uid).set({
      code,
      expiresAt,
      method,
      phone: phone || null,
      email: email || null,
    });

    if (method === 'sms') {
      console.log(`[2FA OTP SMS Setup] Code for phone ${phone}: ${code}`);
    } else {
      console.log(`[2FA OTP Email Setup] Code for email ${email}: ${code}`);
    }

    res.json({ success: true, code }); // Return code in response for development notification triggering
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send setup OTP';
    res.status(500).json({ error: message });
  }
});

// 2FA Setup Verify and Enable
app.post('/api/2fa/verify-setup-otp', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { code, method, phone, email } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const otpDoc = await db.collection('two_factor_otps').doc(uid).get();
    if (!otpDoc.exists) {
      res.status(400).json({ error: 'No verification code found. Please request one.' });
      return;
    }

    const otpData = otpDoc.data();
    if (otpData?.code !== code || new Date() > otpData?.expiresAt.toDate()) {
      res.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }

    // Generate 8 backup codes (8 digits each)
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(10000000 + Math.random() * 90000000).toString()
    );

    // Save configuration to profiles
    await db.collection('profiles').doc(uid).set({
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
    await db.collection('two_factor_otps').doc(uid).delete();

    res.json({ success: true, backupCodes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify setup OTP';
    res.status(500).json({ error: message });
  }
});

// 2FA Send Code on Login
app.post('/api/2fa/send-login-otp', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // 1. Verify password
    const valid = await verifyCredentials(email, password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 2. Fetch user
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    // 3. Check Lockout
    const lockoutDoc = await db.collection('two_factor_attempts').doc(uid).get();
    if (lockoutDoc.exists) {
      const data = lockoutDoc.data();
      if (data?.lockedUntil && new Date() < data.lockedUntil.toDate()) {
        const remainingTime = Math.ceil((data.lockedUntil.toDate().getTime() - Date.now()) / 1000 / 60);
        res.status(403).json({ error: `Account locked due to too many failed attempts. Try again in ${remainingTime} minutes.` });
        return;
      }
    }

    // 4. Check if 2FA enabled
    const profileDoc = await db.collection('profiles').doc(uid).get();
    if (!profileDoc.exists || !profileDoc.data()?.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-Factor Authentication is not enabled for this account.' });
      return;
    }

    const profile = profileDoc.data();
    const method = profile?.twoFactorMethod || 'sms';
    const phone = profile?.twoFactorPhone || '';
    const twoFactorEmail = profile?.twoFactorEmail || email;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.collection('two_factor_otps').doc(uid).set({
      code,
      expiresAt,
      method,
      phone: phone || null,
      email: twoFactorEmail || null,
    });

    if (method === 'sms') {
      console.log(`[2FA OTP SMS Login] Code for phone ${phone}: ${code}`);
    } else {
      console.log(`[2FA OTP Email Login] Code for email ${twoFactorEmail}: ${code}`);
    }

    // Mask destination
    let destination = '';
    if (method === 'sms') {
      const cleanPhone = phone || '';
      destination = cleanPhone.length > 7
        ? `${cleanPhone.slice(0, 4)}XXXX${cleanPhone.slice(-3)}`
        : '+977-XXXXXXX';
    } else {
      const parts = twoFactorEmail.split('@');
      destination = `${parts[0].slice(0, 2)}***@${parts[1]}`;
    }

    res.json({ success: true, method, destination, code }); // Code returned in development for client system Notification
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send login OTP';
    res.status(500).json({ error: message });
  }
});

// 2FA Verify Code on Login
app.post('/api/2fa/verify-login-otp', async (req: Request, res: Response) => {
  try {
    const { email, code, useBackupCode } = req.body;
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
      const profileDoc = await db.collection('profiles').doc(uid).get();
      const backupCodes = profileDoc.data()?.twoFactorBackupCodes || [];
      
      if (backupCodes.includes(code)) {
        // Remove code from array
        const updatedBackupCodes = backupCodes.filter((c: string) => c !== code);
        await db.collection('profiles').doc(uid).set({
          twoFactorBackupCodes: updatedBackupCodes
        }, { merge: true });

        // Reset attempts
        await db.collection('two_factor_attempts').doc(uid).delete();
        res.json({ success: true });
        return;
      }
    } else {
      const otpDoc = await db.collection('two_factor_otps').doc(uid).get();
      if (otpDoc.exists) {
        const otpData = otpDoc.data();
        if (otpData?.code === code && new Date() <= otpData?.expiresAt.toDate()) {
          // Success
          await db.collection('two_factor_otps').doc(uid).delete();
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
    const message = error instanceof Error ? error.message : 'Failed to verify login OTP';
    res.status(500).json({ error: message });
  }
});

// 2FA Disable
app.post('/api/2fa/disable', verifyToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { code } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    let valid = false;
    
    // Try OTP first
    const otpDoc = await db.collection('two_factor_otps').doc(uid).get();
    if (otpDoc.exists) {
      const otpData = otpDoc.data();
      if (otpData?.code === code && new Date() <= otpData?.expiresAt.toDate()) {
        valid = true;
        await db.collection('two_factor_otps').doc(uid).delete();
      }
    }
    
    // Try backup code if OTP didn't match
    if (!valid) {
      const profileDoc = await db.collection('profiles').doc(uid).get();
      const backupCodes = profileDoc.data()?.twoFactorBackupCodes || [];
      if (backupCodes.includes(code)) {
        valid = true;
        const updatedBackupCodes = backupCodes.filter((c: string) => c !== code);
        await db.collection('profiles').doc(uid).set({
          twoFactorBackupCodes: updatedBackupCodes
        }, { merge: true });
      }
    }

    if (!valid) {
      res.status(400).json({ error: 'Invalid verification code or backup code.' });
      return;
    }

    // Disable 2FA in profiles
    await db.collection('profiles').doc(uid).set({
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorPhone: null,
      twoFactorEmail: null,
      twoFactorBackupCodes: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Sync to users
    await db.collection('users').doc(uid).set({
      twoFactorEnabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ success: true });
  } catch (error: unknown) {
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
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error' });
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

            const userDoc = await db.collection('users').doc(recipientId).get();
            const fcmTokens = userDoc.data()?.fcmTokens;

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

            const userDoc = await db.collection('users').doc(calleeId).get();
            const fcmTokens = userDoc.data()?.fcmTokens;

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

app.listen(PORT, () => {
  console.log(`NC Network Secure API running on http://localhost:${PORT}`);
  startFirestoreListeners();
});
