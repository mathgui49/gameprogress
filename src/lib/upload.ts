import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 4096; // Max width or height in pixels

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

  // Validate image dimensions using sharp-compatible approach
  // Check PNG/JPEG headers for dimensions without a full decode
  const dims = parseImageDimensions(buffer);
  if (dims && (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION)) {
    console.error(`Image too large: ${dims.width}x${dims.height} (max ${MAX_IMAGE_DIMENSION})`);
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

/** Parse width/height from image binary headers (PNG, JPEG, GIF, WebP). */
function parseImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // PNG: bytes 16-23 contain width (4 bytes) and height (4 bytes) in IHDR
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    // JPEG: scan for SOF0/SOF2 markers (0xFFC0/0xFFC2)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }
    // GIF: bytes 6-9
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
  } catch {
    // Parsing failed — skip dimension check
  }
  return null;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const path = publicUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
