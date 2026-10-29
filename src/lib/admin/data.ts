import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/firebase/admin";
import { fallbackSiteSettings, type SiteSettings } from "@/lib/fallback-data";
import type { AdminCard } from "@/lib/admin/types";
import { SLUG_RE } from "@/lib/admin/validation";
import { toEventItem } from "@/lib/events/content";
import { byStartDate } from "@/lib/events/dates";
import {
  REGISTRATION_TYPES,
  type Attendee,
  type RegistrationType,
  type StoredRegistration,
} from "@/lib/events/registration";
import type { EventItem } from "@/lib/events/types";
import { toResourceItem } from "@/lib/resources/content";
import { sortResources, type ResourceItem } from "@/lib/resources/files";

// Data access layer for /admin. Each function re-checks the session itself
// rather than trusting the page that called it.

function toAdminCard(doc: FirebaseFirestore.DocumentSnapshot): AdminCard {
  return {
    slug: doc.id,
    title: doc.get("title") ?? doc.id,
    description: doc.get("description"),
    icon: doc.get("icon"),
    imageUrl: doc.get("imageUrl"),
    order: doc.get("order") ?? 0,
    sectionSlug: doc.get("sectionSlug"),
  };
}

const byOrder = (a: AdminCard, b: AdminCard) => a.order - b.order;

export async function getAdminSettings(): Promise<SiteSettings> {
  await requireAdmin();
  const snapshot = await getDb().collection("siteSettings").doc("main").get();
  if (!snapshot.exists) return fallbackSiteSettings;

  return {
    heroEyebrow: snapshot.get("heroEyebrow"),
    heroHeadline: snapshot.get("heroHeadline") ?? fallbackSiteSettings.heroHeadline,
    heroSubtitle: snapshot.get("heroSubtitle"),
    heroImageUrl: snapshot.get("heroImageUrl"),
  };
}

export async function getAdminSections(): Promise<AdminCard[]> {
  await requireAdmin();
  const snapshot = await getDb().collection("sections").get();
  return snapshot.docs.map(toAdminCard).sort(byOrder);
}

export async function getAdminSection(slug: string): Promise<AdminCard | null> {
  await requireAdmin();
  if (!SLUG_RE.test(slug)) return null;
  const snapshot = await getDb().collection("sections").doc(slug).get();
  return snapshot.exists ? toAdminCard(snapshot) : null;
}

export async function getAdminMinistries(): Promise<AdminCard[]> {
  await requireAdmin();
  const snapshot = await getDb().collection("ministries").get();
  return snapshot.docs.map(toAdminCard).sort(byOrder);
}

export async function getAdminMinistry(slug: string): Promise<AdminCard | null> {
  await requireAdmin();
  if (!SLUG_RE.test(slug)) return null;
  const snapshot = await getDb().collection("ministries").doc(slug).get();
  return snapshot.exists ? toAdminCard(snapshot) : null;
}

/** Every event, including drafts and scheduled ones, soonest first. */
export async function getAdminEvents(): Promise<EventItem[]> {
  await requireAdmin();
  const snapshot = await getDb().collection("events").get();
  return snapshot.docs.map(toEventItem).sort(byStartDate);
}

export async function getAdminEvent(slug: string): Promise<EventItem | null> {
  await requireAdmin();
  if (!SLUG_RE.test(slug)) return null;
  const snapshot = await getDb().collection("events").doc(slug).get();
  return snapshot.exists ? toEventItem(snapshot) : null;
}

// ---- registrations (private: only ever read here, behind requireAdmin) -------

function toAttendee(item: unknown): Attendee {
  const row = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
  const attendee: Attendee = {
    name: typeof row.name === "string" ? row.name : "",
    category: row.category === "child" ? "child" : "adult",
  };
  if (typeof row.age === "number") attendee.age = row.age;
  if (typeof row.ageRange === "string" && row.ageRange) attendee.ageRange = row.ageRange;
  if (typeof row.dietary === "string" && row.dietary) attendee.dietary = row.dietary;
  return attendee;
}

function toStoredRegistration(doc: FirebaseFirestore.DocumentSnapshot): StoredRegistration {
  const type = doc.get("type") as RegistrationType;
  const created = doc.get("createdAt") as { toDate?: () => Date } | undefined;
  const attendees = doc.get("attendees");

  return {
    id: doc.id,
    type: REGISTRATION_TYPES.includes(type) ? type : "individual",
    groupName: doc.get("groupName"),
    contactName: doc.get("contactName") ?? "",
    contactPhone: doc.get("contactPhone") ?? "",
    contactEmail: doc.get("contactEmail") ?? "",
    emergencyName: doc.get("emergencyName"),
    emergencyPhone: doc.get("emergencyPhone"),
    attendees: Array.isArray(attendees) ? attendees.map(toAttendee) : [],
    paid: doc.get("paid") === true,
    createdAt: (created?.toDate?.() ?? new Date(0)).toISOString(),
  };
}

/** Oldest first. */
export async function getAdminRegistrations(eventSlug: string): Promise<StoredRegistration[]> {
  await requireAdmin();
  if (!SLUG_RE.test(eventSlug)) return [];

  const snapshot = await getDb()
    .collection("events")
    .doc(eventSlug)
    .collection("registrations")
    .get();
  return snapshot.docs
    .map(toStoredRegistration)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countAdminRegistrations(eventSlug: string): Promise<number> {
  await requireAdmin();
  if (!SLUG_RE.test(eventSlug)) return 0;

  const result = await getDb()
    .collection("events")
    .doc(eventSlug)
    .collection("registrations")
    .count()
    .get();
  return result.data().count;
}

// ---- resources (files and links inside a resource category) ----------------

export const RESOURCES_SECTION = "resources";

/** An item as the admin sees it: also knows where its file lives in Storage. */
export type AdminResource = ResourceItem & { storagePath?: string };

function resourcesOf(category: string) {
  return getDb().collection("ministries").doc(category).collection("resources");
}

/** The cards under the Resources section, each with how many items it holds. */
export async function getAdminResourceCategories(): Promise<
  (AdminCard & { resourceCount: number })[]
> {
  await requireAdmin();
  const snapshot = await getDb()
    .collection("ministries")
    .where("sectionSlug", "==", RESOURCES_SECTION)
    .get();

  const categories = snapshot.docs.map(toAdminCard).sort(byOrder);
  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      resourceCount: (await resourcesOf(category.slug).count().get()).data().count,
    })),
  );
}

export async function getAdminResources(category: string): Promise<AdminResource[]> {
  await requireAdmin();
  if (!SLUG_RE.test(category)) return [];
  const snapshot = await resourcesOf(category).get();

  const items: AdminResource[] = [];
  for (const doc of snapshot.docs) {
    const item = toResourceItem(doc);
    if (item) items.push({ ...item, storagePath: doc.get("storagePath") || undefined });
  }
  return sortResources(items);
}

export async function getAdminResource(
  category: string,
  id: string,
): Promise<AdminResource | null> {
  await requireAdmin();
  if (!SLUG_RE.test(category) || !/^[A-Za-z0-9]{20}$/.test(id)) return null;
  const doc = await resourcesOf(category).doc(id).get();
  if (!doc.exists) return null;
  const item = toResourceItem(doc);
  return item ? { ...item, storagePath: doc.get("storagePath") || undefined } : null;
}
