import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/firebase/admin";
import { fallbackSiteSettings, type SiteSettings } from "@/lib/fallback-data";
import type { AdminCard } from "@/lib/admin/types";
import { SLUG_RE } from "@/lib/admin/validation";

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
