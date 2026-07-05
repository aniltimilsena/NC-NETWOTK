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
    
    const originalExt = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(originalExt)) {
      return res.status(400).json({ 
        error: 'File type not allowed' 
      });
    }

    
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

    
    if (file.mimetype !== detected.mime) {
      console.warn(`Upload MIME mismatch: 
        claimed=${file.mimetype} 
        real=${detected.mime}
        ip=${req.ip}
      `);
      
    }

    
    const safeExt = MIME_TO_EXT[detected.mime] || 'bin';
    const safeName = `${randomUUID().replace(/-/g, '')}.${safeExt}`;

    
    

    
    req.validatedFile = {
      buffer: file.buffer,
      safeName,            
      mimeType: detected.mime,  
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
