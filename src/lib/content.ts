import { getDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import {
  fallbackMinistries,
  fallbackSections,
  fallbackSiteSettings,
  type CardItem,
  type SiteSettings,
} from "@/lib/fallback-data";

// Firestore layout:
//   siteSettings/main          -> hero text + image
//   sections/{slug}            -> homepage cards (Departments, Services, ...)
//   ministries/{slug}          -> sub-cards, linked to a section via `sectionSlug`

// Sorted in memory (not via orderBy) so queries need no composite indexes.
function toCardItems(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): CardItem[] {
  return [...docs]
    .sort((a, b) => (a.get("order") ?? 0) - (b.get("order") ?? 0))
    .map((doc) => ({
      _id: doc.id,
      title: doc.get("title"),
      slug: doc.get("slug"),
      description: doc.get("description"),
      icon: doc.get("icon"),
      imageUrl: doc.get("imageUrl"),
    }));
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isFirebaseConfigured) return fallbackSiteSettings;

  try {
    const snapshot = await getDb().collection("siteSettings").doc("main").get();
    if (!snapshot.exists) return fallbackSiteSettings;
    return { ...fallbackSiteSettings, ...(snapshot.data() as SiteSettings) };
  } catch (error) {
    console.error("Failed to read siteSettings from Firestore:", error);
    return fallbackSiteSettings;
  }
}

export async function getSections(): Promise<CardItem[]> {
  if (!isFirebaseConfigured) return fallbackSections;

  try {
    const snapshot = await getDb().collection("sections").get();
    return snapshot.empty ? fallbackSections : toCardItems(snapshot.docs);
  } catch (error) {
    console.error("Failed to read sections from Firestore:", error);
    return fallbackSections;
  }
}

export async function getMinistriesForSection(
  sectionSlug: string,
): Promise<CardItem[]> {
  const fallback = fallbackMinistries[sectionSlug] ?? [];
  if (!isFirebaseConfigured) return fallback;

  try {
    const snapshot = await getDb()
      .collection("ministries")
      .where("sectionSlug", "==", sectionSlug)
      .get();
    return snapshot.empty ? fallback : toCardItems(snapshot.docs);
  } catch (error) {
    console.error(
      `Failed to read ministries for "${sectionSlug}" from Firestore:`,
      error,
    );
    return fallback;
  }
}
