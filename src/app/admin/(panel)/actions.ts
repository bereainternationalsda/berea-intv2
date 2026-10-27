"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, SESSION_COOKIE } from "@/lib/admin/auth";
import {
  deleteStoredImage,
  ImageUploadError,
  uploadImage,
} from "@/lib/admin/storage";
import type { FormState } from "@/lib/admin/types";
import { SLUG_RE, slugify } from "@/lib/admin/validation";
import {
  isValidDateString,
  isValidPhone,
  isValidTimeString,
} from "@/lib/events/dates";
import { getDb } from "@/lib/firebase/admin";

// Every action starts with requireAdmin(): Server Actions are public POST
// endpoints, so the page that rendered the form proves nothing.

type FieldErrors = Record<string, string>;

const SAVE_FAILED = "Couldn't save your changes. Please try again.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function failure(message: string, fieldErrors?: FieldErrors): FormState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

function checkText(
  errors: FieldErrors,
  field: string,
  value: string,
  label: string,
  { required = false, max }: { required?: boolean; max: number },
) {
  if (required && !value) errors[field] = `${label} is required.`;
  else if (value.length > max) {
    errors[field] = `${label} must be ${max} characters or fewer.`;
  }
}

function parseOrder(formData: FormData, errors: FieldErrors): number {
  const raw = text(formData, "order");
  if (raw === "") return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    errors.order = "Order must be a whole number between 0 and 999.";
    return 0;
  }
  return value;
}

// ---- image handling ------------------------------------------------------

type ImageChange = {
  /** undefined = leave as is, null = remove, string = new URL */
  url?: string | null;
  /** previous URL to clean up once the database write succeeds */
  previous?: string;
};

async function resolveImage(
  formData: FormData,
  opts: { folder: string; name: string; currentUrl?: string },
): Promise<ImageChange> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const url = await uploadImage(file, opts.folder, opts.name);
    return { url, previous: opts.currentUrl };
  }
  if (formData.get("removeImage") === "on" && opts.currentUrl) {
    return { url: null, previous: opts.currentUrl };
  }
  return {};
}

function imageFields(key: string, change: ImageChange) {
  if (change.url === undefined) return {};
  return { [key]: change.url === null ? FieldValue.delete() : change.url };
}

/** An upload succeeded but the database write didn't: don't leave an orphan. */
async function discardUpload(change: ImageChange) {
  if (typeof change.url === "string") await deleteStoredImage(change.url);
}

async function resolveImageSafely(
  formData: FormData,
  opts: { folder: string; name: string; currentUrl?: string },
): Promise<{ change: ImageChange } | { error: FormState }> {
  try {
    return { change: await resolveImage(formData, opts) };
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return { error: failure(error.message, { image: error.message }) };
    }
    console.error("Image upload failed:", error);
    return {
      error: failure("The image couldn't be uploaded. Please try again."),
    };
  }
}

// ---- site settings -------------------------------------------------------

export async function saveSettings(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const heroHeadline = text(formData, "heroHeadline");
  const heroEyebrow = text(formData, "heroEyebrow");
  const heroSubtitle = text(formData, "heroSubtitle");

  const errors: FieldErrors = {};
  checkText(errors, "heroHeadline", heroHeadline, "Headline", { required: true, max: 120 });
  checkText(errors, "heroEyebrow", heroEyebrow, "Small heading", { max: 60 });
  checkText(errors, "heroSubtitle", heroSubtitle, "Subtitle", { max: 400 });
  if (Object.keys(errors).length > 0) {
    return failure("Please fix the highlighted fields.", errors);
  }

  const ref = getDb().collection("siteSettings").doc("main");
  const currentUrl = (await ref.get()).get("heroImageUrl") as string | undefined;

  const resolved = await resolveImageSafely(formData, {
    folder: "site",
    name: "hero",
    currentUrl,
  });
  if ("error" in resolved) return resolved.error;
  const { change } = resolved;

  try {
    await ref.set(
      {
        heroHeadline,
        heroEyebrow: heroEyebrow || FieldValue.delete(),
        heroSubtitle: heroSubtitle || FieldValue.delete(),
        ...imageFields("heroImageUrl", change),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("saveSettings failed:", error);
    await discardUpload(change);
    return failure(SAVE_FAILED);
  }

  await deleteStoredImage(change.previous);
  revalidatePath("/", "layout");
  return { status: "success", message: "Site settings saved.", at: Date.now() };
}

// ---- sections (homepage cards) -------------------------------------------

export async function saveSection(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const slug = text(formData, "slug");
  if (!SLUG_RE.test(slug)) return failure("That section doesn't exist.");

  const title = text(formData, "title");
  const description = text(formData, "description");
  const icon = text(formData, "icon");

  const errors: FieldErrors = {};
  checkText(errors, "title", title, "Title", { required: true, max: 60 });
  checkText(errors, "description", description, "Description", { max: 300 });
  checkText(errors, "icon", icon, "Icon", { max: 16 });
  const order = parseOrder(formData, errors);
  if (Object.keys(errors).length > 0) {
    return failure("Please fix the highlighted fields.", errors);
  }

  const ref = getDb().collection("sections").doc(slug);
  const snapshot = await ref.get();
  if (!snapshot.exists) return failure("That section doesn't exist.");

  const resolved = await resolveImageSafely(formData, {
    folder: "sections",
    name: slug,
    currentUrl: snapshot.get("imageUrl"),
  });
  if ("error" in resolved) return resolved.error;
  const { change } = resolved;

  try {
    await ref.set(
      {
        title,
        order,
        description: description || FieldValue.delete(),
        icon: icon || FieldValue.delete(),
        ...imageFields("imageUrl", change),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("saveSection failed:", error);
    await discardUpload(change);
    return failure(SAVE_FAILED);
  }

  await deleteStoredImage(change.previous);
  revalidatePath("/", "layout");
  return { status: "success", message: `"${title}" saved.`, at: Date.now() };
}

// ---- ministries (cards nested under a section) ---------------------------

export async function saveMinistry(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const isCreate = text(formData, "mode") === "create";
  const title = text(formData, "title");
  const description = text(formData, "description");
  const icon = text(formData, "icon");
  const sectionSlug = text(formData, "sectionSlug");
  const slug = isCreate
    ? text(formData, "slug") || slugify(title)
    : text(formData, "slug");

  const errors: FieldErrors = {};
  checkText(errors, "title", title, "Title", { required: true, max: 80 });
  checkText(errors, "description", description, "Description", { max: 1000 });
  checkText(errors, "icon", icon, "Icon", { max: 16 });
  const order = parseOrder(formData, errors);
  if (!SLUG_RE.test(slug)) {
    errors.slug = isCreate
      ? "Use lowercase letters, numbers and hyphens only (e.g. youth-ministry)."
      : "That card doesn't exist.";
  }
  if (!SLUG_RE.test(sectionSlug)) errors.sectionSlug = "Choose a section.";
  if (Object.keys(errors).length > 0) {
    return failure("Please fix the highlighted fields.", errors);
  }

  const db = getDb();
  const section = await db.collection("sections").doc(sectionSlug).get();
  if (!section.exists) {
    return failure("Please fix the highlighted fields.", {
      sectionSlug: "That section doesn't exist.",
    });
  }

  const ref = db.collection("ministries").doc(slug);
  const existing = await ref.get();
  if (isCreate && existing.exists) {
    return failure("Please fix the highlighted fields.", {
      slug: "A card with this web address already exists. Choose another.",
    });
  }
  if (!isCreate && !existing.exists) return failure("That card no longer exists.");

  const resolved = await resolveImageSafely(formData, {
    folder: "ministries",
    name: slug,
    currentUrl: existing.get("imageUrl"),
  });
  if ("error" in resolved) return resolved.error;
  const { change } = resolved;

  try {
    if (isCreate) {
      // create() rejects FieldValue.delete(), so only include non-empty values.
      await ref.create({
        title,
        slug,
        order,
        sectionSlug,
        ...(description ? { description } : {}),
        ...(icon ? { icon } : {}),
        ...(typeof change.url === "string" ? { imageUrl: change.url } : {}),
      });
    } else {
      await ref.set(
        {
          title,
          order,
          sectionSlug,
          description: description || FieldValue.delete(),
          icon: icon || FieldValue.delete(),
          ...imageFields("imageUrl", change),
        },
        { merge: true },
      );
    }
  } catch (error) {
    console.error("saveMinistry failed:", error);
    await discardUpload(change);
    return failure(SAVE_FAILED);
  }

  await deleteStoredImage(change.previous);
  revalidatePath("/", "layout");

  if (isCreate) redirect("/admin/ministries");
  return { status: "success", message: `"${title}" saved.`, at: Date.now() };
}

export async function deleteMinistry(formData: FormData): Promise<void> {
  await requireAdmin();

  const slug = text(formData, "slug");
  if (!SLUG_RE.test(slug)) redirect("/admin/ministries");

  const ref = getDb().collection("ministries").doc(slug);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    const imageUrl = snapshot.get("imageUrl") as string | undefined;
    await ref.delete();
    await deleteStoredImage(imageUrl);
    revalidatePath("/", "layout");
  }

  redirect("/admin/ministries");
}

// ---- events (camps, trainings and other programs) -------------------------

export async function saveEvent(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const isCreate = text(formData, "mode") === "create";
  const title = text(formData, "title");
  const slug = isCreate
    ? text(formData, "slug") || slugify(title)
    : text(formData, "slug");
  const summary = text(formData, "summary");
  const description = text(formData, "description").replace(/\r\n/g, "\n");
  const venue = text(formData, "venue");
  const costs = text(formData, "costs").replace(/\r\n/g, "\n");
  const contactName = text(formData, "contactName");
  const contactPhone = text(formData, "contactPhone");
  const startDate = text(formData, "startDate");
  const startTime = text(formData, "startTime");
  const endDate = text(formData, "endDate");
  const endTime = text(formData, "endTime");
  const showFrom = text(formData, "showFrom");
  const showUntil = text(formData, "showUntil");
  const published = formData.get("published") === "on";

  const errors: FieldErrors = {};
  checkText(errors, "title", title, "Title", { required: true, max: 100 });
  checkText(errors, "summary", summary, "Short summary", { max: 200 });
  checkText(errors, "description", description, "Details", { max: 5000 });
  checkText(errors, "venue", venue, "Venue", { max: 150 });
  checkText(errors, "costs", costs, "Costs", { max: 500 });
  checkText(errors, "contactName", contactName, "Contact name", { max: 80 });

  if (!SLUG_RE.test(slug)) {
    errors.slug = isCreate
      ? "Use lowercase letters, numbers and hyphens only (e.g. youth-camp-2026)."
      : "That event doesn't exist.";
  }
  if (contactPhone && !isValidPhone(contactPhone)) {
    errors.contactPhone = "Enter a valid phone number, e.g. 082 123 4567.";
  }

  const startOk = isValidDateString(startDate);
  if (!startDate) errors.startDate = "Start date is required.";
  else if (!startOk) errors.startDate = "Enter a valid date.";

  if (endDate && !isValidDateString(endDate)) {
    errors.endDate = "Enter a valid date.";
  } else if (endDate && startOk && endDate < startDate) {
    errors.endDate = "The end date can't be before the start date.";
  }

  if (startTime && !isValidTimeString(startTime)) errors.startTime = "Enter a valid time.";
  if (endTime && !isValidTimeString(endTime)) errors.endTime = "Enter a valid time.";
  if (
    startTime && endTime && !errors.startTime && !errors.endTime &&
    (!endDate || endDate === startDate) && endTime <= startTime
  ) {
    errors.endTime = "The end time must be after the start time.";
  }

  if (showFrom && !isValidDateString(showFrom)) errors.showFrom = "Enter a valid date.";
  if (showUntil && !isValidDateString(showUntil)) {
    errors.showUntil = "Enter a valid date.";
  } else if (showFrom && showUntil && !errors.showFrom && showUntil < showFrom) {
    errors.showUntil = "This can't be before the \u201cshow from\u201d date.";
  }

  if (Object.keys(errors).length > 0) {
    return failure("Please fix the highlighted fields.", errors);
  }

  const ref = getDb().collection("events").doc(slug);
  const existing = await ref.get();
  if (isCreate && existing.exists) {
    return failure("Please fix the highlighted fields.", {
      slug: "An event with this web address already exists. Choose another.",
    });
  }
  if (!isCreate && !existing.exists) return failure("That event no longer exists.");

  const resolved = await resolveImageSafely(formData, {
    folder: "events",
    name: slug,
    currentUrl: existing.get("imageUrl"),
  });
  if ("error" in resolved) return resolved.error;
  const { change } = resolved;

  // Blank optional fields are removed on edit; create() rejects FieldValue.delete(),
  // so on create they're simply left out.
  const optional = {
    summary, description, venue, costs, contactName, contactPhone,
    startTime, endDate, endTime, showFrom, showUntil,
  };
  const optionalData: Record<string, string | FieldValue> = {};
  for (const [key, value] of Object.entries(optional)) {
    if (value) optionalData[key] = value;
    else if (!isCreate) optionalData[key] = FieldValue.delete();
  }

  try {
    if (isCreate) {
      await ref.create({
        title,
        slug,
        startDate,
        published,
        ...optionalData,
        ...(typeof change.url === "string" ? { imageUrl: change.url } : {}),
      });
    } else {
      await ref.set(
        { title, startDate, published, ...optionalData, ...imageFields("imageUrl", change) },
        { merge: true },
      );
    }
  } catch (error) {
    console.error("saveEvent failed:", error);
    await discardUpload(change);
    return failure(SAVE_FAILED);
  }

  await deleteStoredImage(change.previous);
  revalidatePath("/", "layout");

  if (isCreate) redirect("/admin/events");
  return { status: "success", message: `"${title}" saved.`, at: Date.now() };
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const slug = text(formData, "slug");
  if (!SLUG_RE.test(slug)) redirect("/admin/events");

  const ref = getDb().collection("events").doc(slug);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    const imageUrl = snapshot.get("imageUrl") as string | undefined;
    await ref.delete();
    await deleteStoredImage(imageUrl);
    revalidatePath("/", "layout");
  }

  redirect("/admin/events");
}

// ---- session -------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
