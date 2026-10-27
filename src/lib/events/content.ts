import "server-only";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { SLUG_RE } from "@/lib/admin/validation";
import {
  byStartDate,
  isListed,
  isPageAvailable,
  todayInSA,
} from "@/lib/events/dates";
import type { EventItem } from "@/lib/events/types";

// Firestore layout:  events/{slug}

/** Shared by the public site and /admin. */
export function toEventItem(doc: FirebaseFirestore.DocumentSnapshot): EventItem {
  return {
    slug: doc.id,
    title: doc.get("title") ?? doc.id,
    summary: doc.get("summary"),
    description: doc.get("description"),
    imageUrl: doc.get("imageUrl"),
    startDate: doc.get("startDate"),
    startTime: doc.get("startTime"),
    endDate: doc.get("endDate"),
    endTime: doc.get("endTime"),
    venue: doc.get("venue"),
    costs: doc.get("costs"),
    contactName: doc.get("contactName"),
    contactPhone: doc.get("contactPhone"),
    published: doc.get("published") === true,
    showFrom: doc.get("showFrom"),
    showUntil: doc.get("showUntil"),
  };
}

/**
 * Events to promote right now, soonest first. Filtering happens here, in
 * memory, so the query needs no composite index (there are only ever a few).
 */
export async function getListedEvents(): Promise<EventItem[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const snapshot = await getDb()
      .collection("events")
      .where("published", "==", true)
      .get();

    const today = todayInSA();
    return snapshot.docs
      .map(toEventItem)
      .filter((event) => event.startDate && isListed(event, today))
      .sort(byStartDate);
  } catch (error) {
    console.error("Failed to read events from Firestore:", error);
    return [];
  }
}

/**
 * One event for its own page. Returns null for drafts, unknown slugs, and events
 * whose "show from" date hasn't arrived. Events that have ended stay reachable
 * (the page says so), so old shared links don't 404.
 */
export async function getPublicEvent(slug: string): Promise<EventItem | null> {
  if (!isFirebaseConfigured || !SLUG_RE.test(slug)) return null;

  try {
    const snapshot = await getDb().collection("events").doc(slug).get();
    if (!snapshot.exists) return null;

    const event = toEventItem(snapshot);
    if (!event.startDate || !isPageAvailable(event, todayInSA())) return null;
    return event;
  } catch (error) {
    console.error(`Failed to read event "${slug}" from Firestore:`, error);
    return null;
  }
}
