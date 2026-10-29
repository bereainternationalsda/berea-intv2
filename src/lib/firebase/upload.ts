import { signInWithCustomToken, signOut } from "firebase/auth";
import { deleteObject, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { getApp } from "firebase/app";
import { getClientAuth } from "@/lib/firebase/client";
import { FILE_TYPES, fileExtension, newStoragePath } from "@/lib/resources/files";

// Browser-only. Uploads a resource file straight to Firebase Storage using a
// short-lived token from /api/admin/upload-token, then signs out again.

export class UploadError extends Error {}

function newUploadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function openUploadSession(): Promise<string> {
  const response = await fetch("/api/admin/upload-token", { method: "POST" });
  if (response.status === 401) {
    throw new UploadError("Your sign-in has expired. Please sign in again.");
  }
  if (!response.ok) throw new UploadError("Couldn't get permission to upload. Please try again.");

  const { token, bucket } = (await response.json()) as { token: string; bucket: string };
  await signInWithCustomToken(getClientAuth(), token);
  return bucket;
}

function describe(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "storage/unauthorized":
      return "Storage isn't set up to accept uploads yet. The Storage rules from the project README need to be published in the Firebase console.";
    case "storage/canceled":
      return "The upload was cancelled.";
    case "storage/retry-limit-exceeded":
    case "storage/network-request-failed":
      return "The upload was interrupted. Check your connection and try again.";
    case "storage/quota-exceeded":
      return "Firebase Storage is out of space or quota.";
  }
  return error instanceof UploadError
    ? error.message
    : "The file couldn't be uploaded. Please try again.";
}

/** Uploads and returns the path it was stored under. */
export async function uploadResourceFile(
  file: File,
  category: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const ext = fileExtension(file.name);
  const mime = FILE_TYPES[ext]?.mime;
  if (!mime) throw new UploadError("That kind of file isn't allowed.");

  try {
    const bucket = await openUploadSession();
    const storage = getStorage(getApp(), `gs://${bucket}`);
    const path = newStoragePath(category, file.name, newUploadId());
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: mime });

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => onProgress(snapshot.bytesTransferred / snapshot.totalBytes),
        reject,
        () => resolve(),
      );
    });
    return path;
  } catch (error) {
    throw new UploadError(describe(error));
  } finally {
    await signOut(getClientAuth()).catch(() => undefined);
  }
}

/** Best effort: removes an upload that was never saved. */
export async function discardUploadedFile(path: string): Promise<void> {
  try {
    const bucket = await openUploadSession();
    await deleteObject(ref(getStorage(getApp(), `gs://${bucket}`), path));
  } catch {
    // Nothing more to do; an orphan costs a few MB at worst.
  } finally {
    await signOut(getClientAuth()).catch(() => undefined);
  }
}
