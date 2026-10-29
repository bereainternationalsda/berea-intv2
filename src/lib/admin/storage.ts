import "server-only";
import { randomUUID } from "node:crypto";
import {
  bytesMatchExtension,
  displayFileName,
  FILE_TYPES,
  fileExtension,
  isValidResourcePath,
  MAX_FILE_BYTES,
  SNIFF_BYTES,
} from "@/lib/resources/files";
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

// ---- resource files (uploaded straight from the browser) ------------------

export class ResourceFileError extends Error {}

export type PublishedFile = {
  /** Permanent public download address. */
  url: string;
  path: string;
  size: number;
  /** Extension without the dot. */
  ext: string;
};

function downloadUrl(bucketName: string, path: string, token: string) {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
    `${encodeURIComponent(path)}?alt=media&token=${token}`
  );
}

/** RFC 5987 encoding, so a file name with spaces or accents downloads under its own name. */
function contentDisposition(inline: boolean, fileName: string) {
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`;
}

/**
 * The browser uploads the file itself (it can be far larger than a server
 * request may be), then asks us to publish it. Nothing the browser says is
 * trusted: we re-check the path, the real size and the real file contents, set
 * the content type and download link ourselves, and delete anything that fails.
 * Callers must already have passed requireAdmin().
 */
export async function publishUploadedFile(
  path: string,
  category: string,
  originalName: string,
): Promise<PublishedFile> {
  if (!isValidResourcePath(path, category)) {
    throw new ResourceFileError("That upload isn't valid. Please choose the file again.");
  }

  const bucket = getBucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) {
    throw new ResourceFileError("The file didn't finish uploading. Please try again.");
  }

  const reject = async (message: string): Promise<never> => {
    await file.delete({ ignoreNotFound: true });
    throw new ResourceFileError(message);
  };

  const ext = fileExtension(path);
  const info = FILE_TYPES[ext];
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (!info || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
    return reject("That file is empty or too large.");
  }

  const [head] = await file.download({ start: 0, end: SNIFF_BYTES - 1 });
  if (!bytesMatchExtension(ext, head)) {
    return reject(`That doesn't look like a real .${ext} file, so it wasn't added.`);
  }

  const token = randomUUID();
  const name = displayFileName(originalName) || path.split("/").pop() || `file.${ext}`;
  await file.setMetadata({
    contentType: info.mime,
    contentDisposition: contentDisposition(info.inline, name),
    metadata: { firebaseStorageDownloadTokens: token },
  });

  return { url: downloadUrl(bucket.name, path, token), path, size, ext };
}

/** Removes a file we published (or an upload that was never published). */
export async function deleteResourceFile(path?: string): Promise<void> {
  if (!path || !path.startsWith("resources/") || path.includes("..")) return;
  try {
    await getBucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error("Could not delete a resource file from Storage:", error);
  }
}
