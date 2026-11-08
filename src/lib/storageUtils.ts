import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "./imageUtils";

/**
 * Uploads an image file to a Supabase Storage bucket with automatic client-side compression.
 * Compresses the image in the browser (down to ~100KB-200KB) before uploading,
 * ensuring high speed and preventing Supabase storage quotas from being breached.
 */
export async function uploadImage(
  file: File,
  bucket: "event-images" | "dp-templates",
  folder: string = "uploads"
): Promise<string> {
  // 1. Perform high-efficiency client-side compression before uploading
  const isFrame = bucket === "dp-templates";
  const compressedFile = await compressImageFile(file, {
    maxWidth: isFrame ? 1600 : 1200,
    maxHeight: isFrame ? 1600 : 1200,
    quality: isFrame ? 0.85 : 0.8,
    preferredFormat: "image/webp",
  });

  const fileExt = compressedFile.name.split(".").pop()?.toLowerCase() || (compressedFile.type.includes("webp") ? "webp" : "jpg");
  const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${folder}/${sanitizedFileName}`;

  // 2. Upload compressed asset to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile, {
      cacheControl: "31536000", // 1 year cache
      upsert: false,
      contentType: compressedFile.type || "image/webp",
    });

  if (error) {
    console.error(`[Storage Upload Failed] Bucket: ${bucket}, Path: ${filePath}`, error);
    throw new Error(`Failed to upload image to ${bucket}: ${error.message}`);
  }

  // 3. Retrieve and return public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Could not retrieve public URL for uploaded file.");
  }

  return publicUrlData.publicUrl;
}
