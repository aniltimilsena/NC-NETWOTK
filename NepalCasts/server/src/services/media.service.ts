import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { getCloudinaryConfig } from '../config/cloudinary';
export const uploadAvatar = async (userId: string, buffer: Buffer, mimeType: string): Promise<string> => {
    const b64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${mimeType};base64,${b64}`;
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    const result = await cloudinary.uploader.upload(dataURI, {
        folder: `nc-network/avatars/${userId}`,
        public_id: 'profile',
        overwrite: true,
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    });
    return result.secure_url;
};
export const uploadCastingBanner = async (castingId: string, buffer: Buffer, mimeType: string): Promise<string> => {
    const b64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${mimeType};base64,${b64}`;
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    const result = await cloudinary.uploader.upload(dataURI, {
        folder: `nc-network/castings/${castingId}`,
        public_id: 'banner',
        overwrite: true,
        transformation: [
            { width: 1200, height: 600, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    });
    return result.secure_url;
};
export const uploadGeneralMedia = async (userId: string, buffer: Buffer, mimeType: string, isVideo: boolean): Promise<any> => {
    const b64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${mimeType};base64,${b64}`;
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    const result = await cloudinary.uploader.upload(dataURI, {
        folder: `nc-network/media/${userId}`,
        resource_type: isVideo ? 'video' : 'image',
        transformation: isVideo ? [] : [
            { width: 1080, quality: 'auto', fetch_format: 'auto' }
        ],
    });
    return result;
};
export const deleteGeneralMedia = async (publicId: string, isVideo: boolean): Promise<void> => {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    await cloudinary.uploader.destroy(publicId, {
        resource_type: isVideo ? 'video' : 'image',
    });
};
import fs from 'fs';
import path from 'path';
import { bucket } from '../config';

export const uploadValidatedFile = async (buffer: Buffer, safeName: string, mimeType: string, isVideo: boolean, sanitizedFolder: string): Promise<any> => {
    const resourceType = isVideo ? 'video' : 'image';
    const filename = `${Date.now()}_${safeName}`;
    const filePath = `uploads/${sanitizedFolder}/${filename}`;

    try {
        const file = bucket.file(filePath);
        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
                cacheControl: 'public, max-age=31536000',
            },
            resumable: false,
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        return {
            secure_url: publicUrl,
            public_id: filePath,
            resource_type: resourceType,
        };
    } catch (cloudErr: any) {
        console.warn('[MediaService] Cloud storage bucket unavailable, storing locally:', cloudErr?.message || cloudErr);

        // Fallback: Save directly to frontend public/uploads folder so Vite serves it immediately
        const publicUploadsDir = path.resolve(__dirname, '../../../public/uploads', sanitizedFolder);
        if (!fs.existsSync(publicUploadsDir)) {
            fs.mkdirSync(publicUploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicUploadsDir, filename), buffer);

        // Also ensure server's public/uploads has a copy
        const serverUploadsDir = path.resolve(__dirname, '../../public/uploads', sanitizedFolder);
        if (!fs.existsSync(serverUploadsDir)) {
            fs.mkdirSync(serverUploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(serverUploadsDir, filename), buffer);

        const localUrl = `/uploads/${sanitizedFolder}/${filename}`;
        return {
            secure_url: localUrl,
            public_id: filePath,
            resource_type: resourceType,
        };
    }
};
