/**
 * Utility functions for client-side image optimization and compression.
 * Ensures uploads to Supabase Storage are lightweight (typically 100KB - 250KB)
 * while preserving high visual fidelity for flyers, banners, and DP frames.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  preferredFormat?: "image/webp" | "image/jpeg";
}

/**
 * Compresses an image File in the browser using HTML5 Canvas.
 * Returns a new File object with dramatically reduced file size (typically 80-95% smaller).
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    preferredFormat = "image/webp",
  } = options;

  // If the file is SVG or GIF (animated), don't compress via canvas to avoid losing animation/vector format
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale dimensions down proportionally if exceeding limits
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to original file if canvas context unavailable
        resolve(file);
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format (WebP preferred, falls back to JPEG)
      let outputMime = preferredFormat;
      let extension = preferredFormat === "image/webp" ? "webp" : "jpg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compression somehow produced a larger file, keep original
          if (blob.size >= file.size && file.type === blob.type) {
            resolve(file);
            return;
          }

          const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          const compressedFileName = `${baseName}.${extension}`;

          const compressedFile = new File([blob], compressedFileName, {
            type: blob.type,
            lastModified: Date.now(),
          });

          const savedPercent = Math.round((1 - compressedFile.size / file.size) * 100);
          console.info(
            `[Image Compression] ${file.name}: ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB (${savedPercent}% saved)`
          );

          resolve(compressedFile);
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback to original file if loading fails
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Reads an image file and compresses it to a maximum width/height while maintaining aspect ratio,
 * and returns it as a base64 DataURL string. Used for client-side live previews (e.g. DP generator).
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};
