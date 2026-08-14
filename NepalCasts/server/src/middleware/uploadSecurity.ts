import { randomUUID } from 'crypto';
import path from 'path';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif',
    'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime',
    'video/webm', 'video/3gpp',
]);
const DANGEROUS_EXTENSIONS = new Set([
    '.php', '.php3', '.php4', '.php5', '.phtml',
    '.asp', '.aspx', '.jsp', '.jspx',
    '.sh', '.bash', '.py', '.rb', '.pl',
    '.cgi', '.exe', '.bat', '.cmd',
    '.svg', '.html', '.htm', '.js', '.xml',
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
export interface ProcessedFileInfo {
    buffer: Buffer;
    safeName: string;
    mimeType: string;
    size: number;
    isVideo: boolean;
}
export interface ValidatedRequest extends Request {
    validatedFile?: ProcessedFileInfo;
    validatedFiles?: ProcessedFileInfo[];
}
export const processSingleFileBuffer = async (file: Express.Multer.File): Promise<ProcessedFileInfo> => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(originalExt)) {
        throw new Error('File type extension not allowed');
    }
    let fileTypeFromBuffer: any;
    try {
        const ft = new Function('return import("file-type")')();
        fileTypeFromBuffer = (await ft).fileTypeFromBuffer;
    }
    catch {
        const ft = await import('file-type');
        fileTypeFromBuffer = ft.fileTypeFromBuffer;
    }
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected) {
        throw new Error('Could not verify file binary signature magic numbers');
    }
    if (!ALLOWED_TYPES.has(detected.mime)) {
        throw new Error('File type binary format not supported. Use valid images or videos only.');
    }
    if (file.mimetype !== detected.mime) {
        console.warn(`[Upload Security Alert] MIME mismatch detected: claimed=${file.mimetype}, actual=${detected.mime}`);
    }
    const safeExt = MIME_TO_EXT[detected.mime] || 'bin';
    const safeName = `${randomUUID().replace(/-/g, '')}.${safeExt}`;
    let processedBuffer = file.buffer;
    if (detected.mime.startsWith('image/') && detected.mime !== 'image/gif') {
        try {
            processedBuffer = await sharp(file.buffer)
                .rotate()
                .withMetadata({})
                .toBuffer();
        }
        catch (sharpError) {
            console.warn('Image metadata stripping warning, using validated original buffer:', sharpError);
        }
    }
    return {
        buffer: processedBuffer,
        safeName,
        mimeType: detected.mime,
        size: processedBuffer.length,
        isVideo: detected.mime.startsWith('video/'),
    };
};
export const validateUpload = async (req: ValidatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        if (req.file) {
            req.validatedFile = await processSingleFileBuffer(req.file);
        }
        if (req.files) {
            const filesArray = Array.isArray(req.files)
                ? req.files
                : Object.values(req.files).flat();
            if (filesArray.length > 0) {
                req.validatedFiles = [];
                for (const f of filesArray) {
                    const processed = await processSingleFileBuffer(f);
                    req.validatedFiles.push(processed);
                }
            }
        }
        next();
    }
    catch (error: any) {
        console.error('File validation security failure:', error.message);
        return res.status(400).json({
            success: false,
            error: error.message || 'File security validation failed',
            errorCode: 'INVALID_FILE_SECURITY'
        });
    }
};
