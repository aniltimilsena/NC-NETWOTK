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
export const uploadValidatedFile = async (buffer: Buffer, safeName: string, mimeType: string, isVideo: boolean, sanitizedFolder: string): Promise<any> => {
    const resourceType = isVideo ? 'video' : 'image';
    const { cloudName, apiKey, apiSecret, uploadPreset, isSignedConfigured } = getCloudinaryConfig();
    if (isSignedConfigured) {
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                public_id: safeName.replace(/\.[^.]+$/, ''),
                folder: `nc-network/${sanitizedFolder}`,
                resource_type: resourceType,
                transformation: resourceType === 'image' ? [
                    { quality: 'auto', fetch_format: 'auto' },
                    { width: 1200, crop: 'limit' },
                ] : [],
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            streamifier.createReadStream(buffer).pipe(stream);
        });
    }
    else if (cloudName && uploadPreset) {
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimeType};base64,${b64}`;
        cloudinary.config({
            cloud_name: cloudName,
            secure: true,
        });
        const result = await cloudinary.uploader.unsigned_upload(dataURI, uploadPreset, {
            folder: `nc-network/${sanitizedFolder}`,
            resource_type: resourceType,
        });
        if (result && result.secure_url) {
            return result;
        }
        throw new Error('Cloudinary unsigned upload failed: secure_url not found in response');
    }
    else {
        throw new Error('Cloudinary configuration is missing. Define CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
    }
};
