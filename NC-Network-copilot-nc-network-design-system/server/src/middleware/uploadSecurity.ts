import { fromBuffer } from 'file-type';
import { randomUUID } from 'crypto';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime',
  'video/webm', 'video/3gpp',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.php', '.php3', '.php4', '.php5',
  '.asp', '.aspx', '.jsp', '.jspx',
  '.sh', '.bash', '.py', '.rb', '.pl',
  '.cgi', '.exe', '.bat', '.cmd',
  '.svg', '.html', '.htm', '.js',
  '.htaccess', '.htpasswd',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mp4',
  'video/webm': 'webm',
  'video/3gpp': 'mp4',
};

// Extend Express Request type with validatedFile property
export interface ValidatedRequest extends Request {
  validatedFile?: {
    buffer: Buffer;
    safeName: string;
    mimeType: string;
    size: number;
    isVideo: boolean;
  };
}

export const validateUpload = async (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const file = req.file;
  if (!file) return next();

  try {
    // ─── FIX 4: Block dangerous extensions first ───
    const originalExt = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(originalExt)) {
      return res.status(400).json({ 
        error: 'File type not allowed' 
      });
    }

    // ─── FIX 1 + 2: Validate magic bytes + MIME ───
    const detected = await fromBuffer(file.buffer);
    
    if (!detected) {
      return res.status(400).json({ 
        error: 'Could not determine file type' 
      });
    }

    if (!ALLOWED_TYPES.has(detected.mime)) {
      return res.status(400).json({ 
        error: 'File type not supported. Use images or videos only.' 
      });
    }

    // Mismatch between claimed and real type
    if (file.mimetype !== detected.mime) {
      console.warn(`Upload MIME mismatch: 
        claimed=${file.mimetype} 
        real=${detected.mime}
        ip=${req.ip}
      `);
      // Use real detected type — not client's claim
    }

    // ─── FIX 3: Generate random safe filename ─────
    const safeExt = MIME_TO_EXT[detected.mime] || 'bin';
    const safeName = `${randomUUID().replace(/-/g, '')}.${safeExt}`;

    // ─── FIX 5: Keep in memory — no disk storage ──
    // multer memoryStorage is already handling this

    // Attach validated/safe info to request
    req.validatedFile = {
      buffer: file.buffer,
      safeName,            // random name
      mimeType: detected.mime,  // real type
      size: file.size,
      isVideo: detected.mime.startsWith('video/'),
    };

    next();

  } catch (error) {
    console.error('File validation error:', error);
    return res.status(400).json({ 
      error: 'File validation failed' 
    });
  }
};
