import { getDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { SLUG_RE } from "@/lib/admin/validation";
import {
  normaliseLinkUrl,
  sortResources,
  type ResourceItem,
} from "@/lib/resources/files";

// Firestore layout:
//   ministries/{category}/resources/{id}  -> one file or link in a resource category

const FILE_URL_PREFIX = "https://firebasestorage.googleapis.com/";

/**
 * Turns a stored document into what the pages show. Anything malformed or
 * pointing somewhere unexpected is dropped rather than rendered, so even a
 * bad write can't put a `javascript:` link on the website.
 */
export function toResourceItem(
  doc: FirebaseFirestore.DocumentSnapshot,
): ResourceItem | null {
  const title = doc.get("title");
  const rawUrl = doc.get("url");
  if (typeof title !== "string" || !title || typeof rawUrl !== "string") return null;

  const kind = doc.get("kind") === "link" ? "link" : "file";
  const url = kind === "link" ? normaliseLinkUrl(rawUrl) : rawUrl;
  if (!url) return null;
  if (kind === "file" && !url.startsWith(FILE_URL_PREFIX)) return null;

  const order = doc.get("order");
  return {
    id: doc.id,
    title,
    description: doc.get("description") || undefined,
    kind,
    url,
    fileName: doc.get("fileName") || undefined,
    fileType: doc.get("fileType") || undefined,
    fileSize: typeof doc.get("fileSize") === "number" ? doc.get("fileSize") : undefined,
    order: typeof order === "number" ? order : undefined,
    createdAt: typeof doc.get("createdAt") === "number" ? doc.get("createdAt") : 0,
  };
}

/** Public: everything in one resource category, in display order. */
export async function getResourcesForCategory(category: string): Promise<ResourceItem[]> {
  if (!isFirebaseConfigured || !SLUG_RE.test(category)) return [];

  try {
    const snapshot = await getDb()
      .collection("ministries")
      .doc(category)
      .collection("resources")
      .get();
    return sortResources(
      snapshot.docs.map(toResourceItem).filter((item): item is ResourceItem => item !== null),
    );
  } catch (error) {
    console.error(`Failed to read resources for "${category}" from Firestore:`, error);
    return [];
  }
}
