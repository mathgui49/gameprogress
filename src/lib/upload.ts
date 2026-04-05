import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a file to Supabase Storage and return the public URL.
 * Call from server action only (uses service role key).
 */
export async function uploadImage(
  userId: string,
  base64Data: string,
  folder: "photos" | "profiles" | "posts",
): Promise<string | null> {
  // Validate base64 data URL
  const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const ext = mimeType.split("/")[1] || "jpeg";
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length > MAX_FILE_SIZE) {
    console.error("File too large:", buffer.length);
    return null;
  }

  const fileName = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const path = publicUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
