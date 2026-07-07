/**
 * @module server/config/cloudinary
 * @description Cloudinary SDK configuration and upload utilities.
 */

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export const configureCloudinary = (): void => {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const isPlaceholder = (val: string | undefined): boolean => {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return lower === 'undefined' || lower === 'null' || lower === '' || lower.includes('your_') || lower.includes('dummy') || lower.includes('placeholder');
};

export const getCloudinaryConfig = () => {
  const cloudNameEnv = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudName = isPlaceholder(cloudNameEnv) ? 'du7zu8mca' : cloudNameEnv!;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPresetEnv = process.env.CLOUDINARY_UPLOAD_PRESET;
  const uploadPreset = isPlaceholder(uploadPresetEnv) ? 'stored_media' : uploadPresetEnv!;

  const isSignedConfigured = !!(cloudName && apiKey && apiSecret && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret));

  return { cloudName, apiKey, apiSecret, uploadPreset, isSignedConfigured };
};

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  mimeType: string,
  folder: string,
): Promise<string> => {
  const isVideo = mimeType.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  const { cloudName, apiKey, apiSecret, uploadPreset, isSignedConfigured } = getCloudinaryConfig();

  if (isSignedConfigured) {
    return new Promise<string>((resolve, reject) => {
      try {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });

        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: resourceType },
          (error, result) => {
            if (error) {
              reject(new Error(error.message));
            } else if (result?.secure_url) {
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
        reject(err);
      }
    });
  } else if (cloudName && uploadPreset) {
    const b64 = Buffer.from(fileBuffer).toString('base64');
    const dataURI = `data:${mimeType};base64,${b64}`;

    cloudinary.config({ cloud_name: cloudName, secure: true });

    const result = await cloudinary.uploader.unsigned_upload(dataURI, uploadPreset, {
      folder,
      resource_type: resourceType,
    });

    if (result?.secure_url) {
      return result.secure_url;
    }
    throw new Error('Cloudinary unsigned upload failed: secure_url not found in response');
  } else {
    throw new Error(
      'Cloudinary is not configured on the server. Please define CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
    );
  }
};

export { cloudinary };
