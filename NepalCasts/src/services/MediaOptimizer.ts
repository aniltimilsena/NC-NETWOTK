import imageCompression from "browser-image-compression";
import { logger } from "../utils/logger";

export interface OptimizedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  compressionTimeMs: number;
}

export interface VideoMetadataResult {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  thumbnailBlob: Blob | null;
  previewUrl: string;
}

export class MediaOptimizer {
  /**
   * Client-side adaptive image compression.
   * Offloads processing to Web Workers (non-blocking UI), preserves EXIF orientation,
   * resizes to max 1920x1920 HD resolution, and targets 85-90% visual quality.
   */
  public async optimizeImage(file: File): Promise<OptimizedImageResult> {
    const tStart = performance.now();
    const origSize = file.size;
    const origMb = (origSize / (1024 * 1024)).toFixed(2);

    // Skip compression for lightweight GIFs or SVG
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await this.getImageDimensions(previewUrl);
      return {
        file,
        previewUrl,
        originalSize: origSize,
        optimizedSize: origSize,
        width: dimensions.width,
        height: dimensions.height,
        compressionTimeMs: 0,
      };
    }

    // Adaptive compression targets based on input file size
    let targetMaxSizeMb = 0.8;
    let maxDim = 1920;

    if (origSize > 10 * 1024 * 1024) {
      // Large DSLR photos (10MB - 25MB) -> compress down to ~1.5MB to 2.5MB
      targetMaxSizeMb = 2.0;
      maxDim = 2560;
    } else if (origSize > 3 * 1024 * 1024) {
      targetMaxSizeMb = 1.0;
      maxDim = 1920;
    }

    const options = {
      maxSizeMB: targetMaxSizeMb,
      maxWidthOrHeight: maxDim,
      useWebWorker: true,
      preserveExif: true,
      initialQuality: 0.88,
      fileType: "image/webp",
    };

    try {
      logger.log(`[MediaOptimizer] Optimizing image (${origMb} MB) with WebWorker...`);
      const compressedBlob = await imageCompression(file, options);
      
      const fileName = file.name.substring(0, file.name.lastIndexOf(".")) + ".webp";
      const optimizedFile = new File([compressedBlob], fileName, {
        type: "image/webp",
        lastModified: Date.now(),
      });

      const compressionTimeMs = Math.round(performance.now() - tStart);
      const optSize = optimizedFile.size;
      const optMb = (optSize / (1024 * 1024)).toFixed(2);
      const reduction = (((origSize - optSize) / origSize) * 100).toFixed(1);

      const previewUrl = URL.createObjectURL(optimizedFile);
      const dimensions = await this.getImageDimensions(previewUrl);

      logger.log(
        `[MediaOptimizer] Image optimized in ${compressionTimeMs}ms! ${origMb} MB -> ${optMb} MB (${reduction}% reduction). Resolution: ${dimensions.width}x${dimensions.height}`
      );

      return {
        file: optimizedFile,
        previewUrl,
        originalSize: origSize,
        optimizedSize: optSize,
        width: dimensions.width,
        height: dimensions.height,
        compressionTimeMs,
      };
    } catch (err) {
      logger.warn("[MediaOptimizer] Image compression fallback to original file:", err);
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await this.getImageDimensions(previewUrl);
      return {
        file,
        previewUrl,
        originalSize: origSize,
        optimizedSize: origSize,
        width: dimensions.width,
        height: dimensions.height,
        compressionTimeMs: Math.round(performance.now() - tStart),
      };
    }
  }

  /**
   * Extract video duration, dimensions, and capture a HD thumbnail frame.
   */
  public async extractVideoMetadata(file: File): Promise<VideoMetadataResult> {
    const tStart = performance.now();
    const objectUrl = URL.createObjectURL(file);

    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.0, video.duration / 2 || 0.5);
      };

      video.onseeked = async () => {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const duration = video.duration || 0;
        const aspectRatio = width / (height || 1);

        // Capture frame to canvas for thumbnail generation
        let thumbnailBlob: Blob | null = null;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(width, 640);
          canvas.height = Math.round(canvas.width / aspectRatio);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbnailBlob = await new Promise<Blob | null>((resBlob) =>
              canvas.toBlob(resBlob, "image/webp", 0.85)
            );
          }
        } catch (cErr) {
          logger.warn("[MediaOptimizer] Canvas thumbnail capture error:", cErr);
        }

        const durationMs = Math.round(performance.now() - tStart);
        logger.log(
          `[MediaOptimizer] Video metadata extracted in ${durationMs}ms: ${width}x${height}, Duration: ${duration.toFixed(1)}s`
        );

        resolve({
          duration,
          width,
          height,
          aspectRatio,
          thumbnailBlob,
          previewUrl: objectUrl,
        });
      };

      video.onerror = () => {
        logger.warn("[MediaOptimizer] Video metadata extraction error");
        resolve({
          duration: 0,
          width: 1280,
          height: 720,
          aspectRatio: 16 / 9,
          thumbnailBlob: null,
          previewUrl: objectUrl,
        });
      };
    });
  }

  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth || 1280, height: img.naturalHeight || 720 });
      };
      img.onerror = () => {
        resolve({ width: 1280, height: 720 });
      };
      img.src = url;
    });
  }
}

export const mediaOptimizer = new MediaOptimizer();
