import { Router, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { verifyToken } from '../middleware/auth';
import { validateUpload, type ValidatedRequest } from '../middleware/uploadSecurity';
import { uploadLimiter } from '../middleware/rateLimiter';
import { db, admin } from '../config';
import { getCloudinaryConfig } from '../config/cloudinary';
import { uploadValidatedFile, deleteGeneralMedia, uploadAvatar, uploadCastingBanner, uploadGeneralMedia } from '../services/media.service';
import type { AuthedRequest } from '../types';
const router = Router();
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']);
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/3gpp']);
const multerFileFilter = (_req: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
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
        callback(new Error('File type extension not allowed'));
        return;
    }
    const isImage = allowedImageMimeTypes.has(file.mimetype);
    const isVideo = allowedVideoMimeTypes.has(file.mimetype);
    if (!isImage && !isVideo) {
        callback(new Error('Only standard image and video uploads are allowed'));
        return;
    }
    callback(null, true);
};
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: multerFileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const bannerUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: multerFileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
const mediaUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: multerFileFilter,
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});
router.get('/config/cloudinary', verifyToken, (req: AuthedRequest, res: Response) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    res.json({
        cloudName,
        uploadPreset,
    });
});
router.post('/upload', verifyToken, uploadLimiter, mediaUpload.single('file'), validateUpload, async (req: ValidatedRequest & AuthedRequest, res: Response): Promise<any> => {
    try {
        if (!req.validatedFile) {
            return res.status(400).json({
                success: false,
                message: 'No file provided or file validation failed',
                errorCode: 'NO_FILE_PROVIDED'
            });
        }
        const { buffer, safeName, mimeType, isVideo } = req.validatedFile;
        const rawFolder = (req.body as any)?.folder;
        const sanitizedFolder = (typeof rawFolder === 'string'
            ? rawFolder.replace(/\.{2,}/g, '').replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9_-]/g, '')
            : 'general') || 'general';
        console.log(`[Upload API] Starting validated upload. Size: ${buffer.length} bytes, Target Folder: ${sanitizedFolder}`);
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
    }
    catch (error: any) {
        console.error('[Upload API Error]:', error);
        const errMsg = error.response?.data?.error?.message || error.message || 'Upload failed';
        return res.status(500).json({
            success: false,
            message: errMsg,
            errorCode: 'UPLOAD_FAILED'
        });
    }
});
router.delete('/upload/:publicId', verifyToken, async (req: AuthedRequest<{
    publicId: string;
}>, res: Response): Promise<any> => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        const resourceType = (req.body as any)?.resourceType || 'image';
        const isVideo = resourceType === 'video';
        await deleteGeneralMedia(publicId, isVideo);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: 'Delete failed' });
    }
});
router.post('/upload/avatar', verifyToken, uploadLimiter, avatarUpload.single('avatar'), validateUpload, async (req: ValidatedRequest & AuthedRequest, res: Response): Promise<any> => {
    try {
        if (!req.validatedFile || !req.user) {
            return res.status(400).json({ error: 'No validated avatar file provided' });
        }
        const userId = req.user.uid;
        const avatarUrl = await uploadAvatar(userId, req.validatedFile.buffer, req.validatedFile.mimeType);
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
    }
    catch (error: any) {
        console.error('Avatar upload error:', error);
        return res.status(500).json({ error: error.message || 'Avatar upload failed' });
    }
});
router.post('/upload/casting/:castingId', verifyToken, uploadLimiter, bannerUpload.single('banner'), validateUpload, async (req: ValidatedRequest & AuthedRequest, res: Response): Promise<any> => {
    try {
        if (!req.validatedFile || !req.user) {
            return res.status(400).json({ error: 'No validated banner file provided' });
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
        const bannerUrl = await uploadCastingBanner(castingId, req.validatedFile.buffer, req.validatedFile.mimeType);
        return res.json({
            success: true,
            url: bannerUrl
        });
    }
    catch (error: any) {
        console.error('Casting banner upload error:', error);
        return res.status(500).json({ error: error.message || 'Upload failed' });
    }
});
router.post('/upload/media', verifyToken, uploadLimiter, mediaUpload.array('media', 10), validateUpload, async (req: ValidatedRequest & AuthedRequest, res: Response): Promise<any> => {
    try {
        const validFiles = req.validatedFiles || (req.validatedFile ? [req.validatedFile] : []);
        if (validFiles.length === 0 || !req.user) {
            return res.status(400).json({ error: 'No valid files provided' });
        }
        const userId = req.user.uid;
        const existingMediaSnap = await db
            .collection('users').doc(userId)
            .collection('media')
            .get();
        if (existingMediaSnap.size + validFiles.length > 50) {
            return res.status(400).json({
                success: false,
                error: `Storage quota exceeded. Maximum allowed media items is 50. Currently stored: ${existingMediaSnap.size}.`,
                errorCode: 'STORAGE_QUOTA_EXCEEDED'
            });
        }
        const results = [];
        for (const item of validFiles) {
            const result = await uploadGeneralMedia(userId, item.buffer, item.mimeType, item.isVideo);
            const mediaRef = await db
                .collection('users').doc(userId)
                .collection('media').add({
                url: result.secure_url,
                publicId: result.public_id,
                type: item.isVideo ? 'video' : 'image',
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
    }
    catch (error: any) {
        console.error('Media upload error:', error);
        return res.status(500).json({ error: error.message || 'Upload failed' });
    }
});
router.delete('/upload/media/:mediaId', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
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
    }
    catch (error: any) {
        console.error('Media deletion error:', error);
        return res.status(500).json({ error: error.message || 'Delete failed' });
    }
});
export default router;
