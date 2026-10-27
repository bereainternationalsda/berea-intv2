import "server-only";
import { randomUUID } from "node:crypto";
import { getBucket } from "@/lib/firebase/admin";

export class ImageUploadError extends Error {}

// SVG is deliberately excluded: it can carry scripts.
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Identify the real format from the file's first bytes, not the client's claim. */
function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Uploads to Firebase Storage under a server-chosen path and returns a
 * permanent download URL. Callers must already have passed requireAdmin().
 */
export async function uploadImage(
  file: File,
  folder: string,
  name: string,
): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError("That image is too large. Please use one under 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMimeType(buffer);
  if (!mimeType) {
    throw new ImageUploadError("Please choose a JPG, PNG or WebP image.");
  }

  const bucket = getBucket();
  let bucketExists = false;
  try {
    [bucketExists] = await bucket.exists();
  } catch {
    // treated the same as "not set up" below
  }
  if (!bucketExists) {
    throw new ImageUploadError(
      "Image uploads aren't available yet: Firebase Storage hasn't been enabled for this project.",
    );
  }

  const path = `images/${folder}/${name}-${Date.now()}.${EXTENSIONS[mimeType]}`;
  const token = randomUUID();

  await bucket.file(path).save(buffer, {
    contentType: mimeType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });

  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(path)}?alt=media&token=${token}`
  );
}

/**
 * Best-effort cleanup of a replaced/removed image. Only touches objects that
 * live under images/ in our own bucket; any other URL is left alone.
 */
export async function deleteStoredImage(url?: string): Promise<void> {
  if (!url) return;

  try {
    const bucket = getBucket();
    const parsed = new URL(url);
    const prefix = `/v0/b/${bucket.name}/o/`;
    if (
      parsed.hostname !== "firebasestorage.googleapis.com" ||
      !parsed.pathname.startsWith(prefix)
    ) {
      return;
    }

    const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (!path.startsWith("images/")) return;

    await bucket.file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error("Could not delete old image from Storage:", error);
  }
}
