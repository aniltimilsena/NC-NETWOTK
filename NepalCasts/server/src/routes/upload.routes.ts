import { Router, type Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { verifyToken } from '../middleware/auth';
import { validateUpload } from '../middleware/uploadSecurity';
import { db, admin } from '../config';
import { getCloudinaryConfig } from '../config/cloudinary';
import {
  uploadValidatedFile,
  deleteGeneralMedia,
  uploadAvatar,
  uploadCastingBanner,
  uploadGeneralMedia
} from '../services/media.service';
import type { AuthedRequest } from '../types';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many upload attempts from this IP, please try again later',
});

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

const multerFileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const dangerousExtensions = [
    '.php', '.php3', '.php4', '.php5', '.phtml',
    '.asp', '.aspx', '.jsp', '.jspx',
    '.sh', '.bash', '.py', '.rb', '.pl',
    '.cgi', '.exe', '.bat', '.cmd',
    '.js', '.html', '.htm', '.xml', '.svg',
    '.htaccess', '.htpasswd',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    callback(new Error('File type not allowed'));
    return;
  }

  const isImage = allowedImageMimeTypes.has(file.mimetype);
  const isVideo = allowedVideoMimeTypes.has(file.mimetype);
  if (!isImage && !isVideo) {
    callback(new Error('Only image and video uploads are allowed'));
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: multerFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, 
    files: 10,
  },
});

// GET /api/config/cloudinary
router.get('/config/cloudinary', verifyToken, (req: AuthedRequest, res: Response) => {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  res.json({
    cloudName,
    uploadPreset,
  });
});

// POST /api/upload
router.post(
  '/upload',
  verifyToken,
  uploadLimiter,
  upload.single('file'),
  validateUpload,
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      if (!req.validatedFile) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
          errorCode: 'NO_FILE_PROVIDED'
        });
      }

      const { buffer, safeName, mimeType, isVideo } = req.validatedFile;
      
      const rawFolder = req.body.folder;
      const sanitizedFolder = (typeof rawFolder === 'string'
        ? rawFolder.replace(/\.{2,}/g, '').replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9_-]/g, '')
        : 'general') || 'general';

      console.log(`[Upload API] Starting upload. Size: ${buffer.length} bytes, Target Folder: ${sanitizedFolder}`);

      const result: any = await uploadValidatedFile(buffer, safeName, mimeType, isVideo, sanitizedFolder);

      console.log('[Upload API] Upload success:', result.secure_url);
      return res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        type: mimeType,
        width: result.width,
        height: result.height,
        duration: result.duration || null,
      });
    } catch (error: any) {
      console.error('[Upload API Error]:', error);
      const errMsg = error.response?.data?.error?.message || error.message || 'Upload failed';
      return res.status(500).json({
        success: false,
        message: errMsg,
        errorCode: 'UPLOAD_FAILED'
      });
    }
  }
);

// DELETE /api/upload/:publicId
router.delete(
  '/upload/:publicId',
  verifyToken,
  async (req: AuthedRequest<{ publicId: string }>, res: Response): Promise<any> => {
    try {
      const publicId = decodeURIComponent(req.params.publicId);
      const resourceType = req.body.resourceType || 'image';
      const isVideo = resourceType === 'video';

      await deleteGeneralMedia(publicId, isVideo);
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Delete failed' });
    }
  }
);

// POST /api/upload/avatar
router.post(
  '/upload/avatar',
  verifyToken,
  uploadLimiter,
  upload.single('avatar'),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      if (!req.file || !req.user) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const userId = req.user.uid;
      const avatarUrl = await uploadAvatar(userId, req.file.buffer, req.file.mimetype);

      const userRef = db.collection('users').doc(userId);
      const profileRef = db.collection('profiles').doc(userId);

      await db.runTransaction(async (transaction) => {
        transaction.update(userRef, { photoURL: avatarUrl, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.update(profileRef, { image: avatarUrl, photoURL: avatarUrl, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });

      return res.json({ 
        success: true, 
        url: avatarUrl 
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

// POST /api/upload/casting/:castingId
router.post(
  '/upload/casting/:castingId',
  verifyToken,
  upload.single('banner'),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      if (!req.file || !req.user) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { castingId } = req.params;
      const userId = req.user.uid;

      if (castingId !== 'new') {
        const castingDoc = await db.collection('casting_calls').doc(castingId).get();
        if (!castingDoc.exists) {
          return res.status(404).json({ error: 'Casting call not found' });
        }
        if (castingDoc.data()?.createdBy !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const bannerUrl = await uploadCastingBanner(castingId, req.file.buffer, req.file.mimetype);

      return res.json({ 
        success: true, 
        url: bannerUrl 
      });
    } catch (error: any) {
      console.error('Casting banner upload error:', error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

// POST /api/upload/media
router.post(
  '/upload/media',
  verifyToken,
  uploadLimiter,
  upload.array('media', 10),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      if (!req.files || !req.user) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const files = req.files as Express.Multer.File[];
      const userId = req.user.uid;
      const results = [];

      for (const file of files) {
        const isVideo = file.mimetype.startsWith('video/');
        const result = await uploadGeneralMedia(userId, file.buffer, file.mimetype, isVideo);
        
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

      return res.json({ success: true, files: results });
    } catch (error: any) {
      console.error('Media upload error:', error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

// DELETE /api/upload/media/:mediaId
router.delete(
  '/upload/media/:mediaId',
  verifyToken,
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.uid;
      const { mediaId } = req.params;

      const mediaDoc = await db
        .collection('users').doc(userId)
        .collection('media').doc(mediaId).get();

      if (!mediaDoc.exists) {
        return res.status(404).json({ error: 'Not found' });
      }

      const publicId = mediaDoc.data()?.publicId;
      const mediaType = mediaDoc.data()?.type || 'image';

      if (publicId) {
        await deleteGeneralMedia(publicId, mediaType === 'video');
      }

      await mediaDoc.ref.delete();

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Media deletion error:', error);
      return res.status(500).json({ error: error.message || 'Delete failed' });
    }
  }
);

export default router;
