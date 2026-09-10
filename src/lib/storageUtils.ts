import { supabase } from "@/integrations/supabase/client";
import { compressImageToBase64 } from "./imageUtils";

/**
 * Uploads an image file to a Supabase Storage bucket.
 * If the bucket is not yet configured or an error occurs,
 * it gracefully falls back to a compressed base64 data URL.
 */
export async function uploadImage(
  file: File,
  bucket: "event-images" | "dp-templates",
  folder: string = "uploads"
): Promise<string> {
  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.warn(`Supabase storage upload to bucket "${bucket}" encountered an issue (${error.message}). Falling back to local image compression.`);
      return await compressImageToBase64(file);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }

    return await compressImageToBase64(file);
  } catch (err) {
    console.warn("Storage upload exception, falling back to local compression:", err);
    return await compressImageToBase64(file);
  }
}
