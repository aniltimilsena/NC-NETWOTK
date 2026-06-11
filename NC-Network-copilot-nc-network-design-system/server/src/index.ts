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

const db = admin.firestore();
const bucket = admin.storage().bucket();
const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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

const allowedUploadMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

app.use(helmet());
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedUploadMimeTypes.has(file.mimetype)) {
      callback(new Error('Only image uploads are allowed'));
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
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  image: z.string().optional(),
  coverImage: z.string().optional(),
  email: z.string().email().optional(),
});

const CastingCallSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.enum(['Actors', 'Directors', 'Models', 'Dancers', 'Musicians', 'Voice Over', 'VFX', 'Writers']),
  budget: z.string().optional(),
  location: z.string(),
});

const MessageSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file']).optional().default('text'),
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
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    req.user = decodedToken;
    next();
  } catch {
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

app.post('/api/upload', verifyToken, uploadLimiter, upload.single('file'), async (req: AuthedRequest, res: Response) => {
  if (!req.file || !req.user) {
    res.status(400).send('No file uploaded');
    return;
  }

  try {
    const fileName = `${req.user.uid}/${Date.now()}_optimized.webp`;
    const fileRef = bucket.file(fileName);

    const buffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const blobStream = fileRef.createWriteStream({
      metadata: {
        contentType: 'image/webp',
      },
    });

    blobStream.on('error', (err: Error) => res.status(500).json({ error: err.message }));
    blobStream.on('finish', async () => {
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ url: signedUrl });
    });

    blobStream.end(buffer);
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
    res.json({ success: true });
  } catch (error: unknown) {
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

app.post('/api/casting', verifyToken, isAdmin, async (req: AuthedRequest, res: Response) => {
  try {
    const validatedData = CastingCallSchema.parse(req.body);
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).send('Unauthorized');
      return;
    }

    const docRef = await db.collection('casting_calls').add({
      ...validatedData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      status: 'Open',
    });
    res.json({ id: docRef.id });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create casting call';
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

      const newMessage = {
        senderId: uid,
        ...validatedData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('conversations')
        .doc(req.params.conversationId)
        .collection('messages')
        .add(newMessage);

      // Trigger FCM to participants (except sender)
      const otherParticipants = participants.filter((p: string) => p !== uid);
      if (otherParticipants.length > 0) {
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
      }

      res.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to send message';
      res.status(500).json({ error: message });
    }
  },
);

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

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof Error && error.message === 'Only image uploads are allowed') {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues });
    return;
  }
  res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`NC Network Secure API running on http://localhost:${PORT}`);
});
