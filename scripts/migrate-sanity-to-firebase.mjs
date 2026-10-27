// Copies content from Sanity into Firestore (and optionally re-hosts images
// in Firebase Storage).
//
// Usage:
//   node --env-file=.env.local scripts/migrate-sanity-to-firebase.mjs            # dry run
//   node --env-file=.env.local scripts/migrate-sanity-to-firebase.mjs --apply    # write
//
// Safe to re-run: documents are keyed by slug, so --apply overwrites instead
// of duplicating. Nothing is ever deleted from Sanity or Firestore.
//
// Images: if the Firebase Storage bucket exists, each image is downloaded from
// the Sanity CDN and uploaded to Storage. If not, the Sanity CDN URL is kept
// as-is (the site keeps working) and re-running later will re-host them.
// Do NOT delete the Sanity project until images show a firebasestorage URL.

import { randomUUID } from "node:crypto";
import { createClient } from "@sanity/client";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const apply = process.argv.includes("--apply");

const required = [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(", ")} (run with --env-file=.env.local)`);
  process.exit(1);
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",
});

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore(app);
const bucket = process.env.FIREBASE_STORAGE_BUCKET ? getStorage(app).bucket() : null;

const CARD_FIELDS = `title, "slug": slug.current, description, icon, order,
  "imageUrl": image.asset->url`;

async function readSanity() {
  const [settings, sections, ministries] = await Promise.all([
    sanity.fetch(`*[_type == "siteSettings"][0]{
      heroEyebrow, heroHeadline, heroSubtitle,
      "heroImageUrl": heroImage.asset->url
    }`),
    sanity.fetch(`*[_type == "section"] | order(order asc){ ${CARD_FIELDS} }`),
    sanity.fetch(`*[_type == "ministry"] | order(order asc){
      ${CARD_FIELDS}, "sectionSlug": section->slug.current
    }`),
  ]);
  return { settings, sections, ministries };
}

const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

async function bucketUsable() {
  if (!bucket) return false;
  try {
    const [exists] = await bucket.exists();
    return exists;
  } catch {
    return false;
  }
}

async function rehostImage(url, storagePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed (${response.status}) for ${url}`);
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  const token = randomUUID();
  await bucket.file(storagePath).save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(storagePath)}?alt=media&token=${token}`
  );
}

async function main() {
  console.log(apply ? "MODE: APPLY (writing to Firestore)\n" : "MODE: DRY RUN (nothing is written; pass --apply)\n");

  const { settings, sections, ministries } = await readSanity();
  const canRehost = await bucketUsable();
  console.log(
    canRehost
      ? `Storage: bucket "${bucket.name}" found - images will be re-hosted.`
      : "Storage: no usable bucket - images keep their Sanity CDN URL for now.",
  );

  const writes = []; // { collection, id, data, image: {url, path} | null }
  const skipped = [];

  if (settings) {
    const { heroImageUrl, ...rest } = settings;
    writes.push({
      collection: "siteSettings",
      id: "main",
      data: clean({ ...rest, heroImageUrl }),
      image: heroImageUrl ? { field: "heroImageUrl", url: heroImageUrl, path: "images/site/hero" } : null,
    });
  } else {
    skipped.push("siteSettings: no document found in Sanity");
  }

  for (const [collection, docs] of [["sections", sections], ["ministries", ministries]]) {
    for (const doc of docs) {
      if (!doc.slug || !doc.title) {
        skipped.push(`${collection}: skipped a document missing title/slug (${JSON.stringify(doc.title ?? doc.slug ?? "?")})`);
        continue;
      }
      if (collection === "ministries" && !doc.sectionSlug) {
        skipped.push(`ministries/${doc.slug}: skipped - not linked to a section`);
        continue;
      }
      writes.push({
        collection,
        id: doc.slug,
        data: clean(doc),
        image: doc.imageUrl ? { field: "imageUrl", url: doc.imageUrl, path: `images/${collection}/${doc.slug}` } : null,
      });
    }
  }

  let rehosted = 0;
  for (const write of writes) {
    if (write.image && canRehost && apply) {
      const ext = new URL(write.image.url).pathname.split(".").pop() || "jpg";
      write.data[write.image.field] = await rehostImage(write.image.url, `${write.image.path}.${ext}`);
      rehosted += 1;
    }
    const imageNote = write.image
      ? canRehost
        ? apply ? " [image re-hosted]" : " [image would be re-hosted]"
        : " [image kept on Sanity CDN]"
      : "";
    console.log(`  ${write.collection}/${write.id}${imageNote}`);
  }

  if (apply) {
    const batch = db.batch();
    for (const write of writes) {
      batch.set(db.collection(write.collection).doc(write.id), write.data);
    }
    await batch.commit();
  }

  console.log(`\n${apply ? "Wrote" : "Would write"} ${writes.length} document(s)` +
    (apply ? `, re-hosted ${rehosted} image(s).` : "."));
  for (const note of skipped) console.log(`  ! ${note}`);
  if (!canRehost && writes.some((w) => w.image)) {
    console.log("\nReminder: images still point at cdn.sanity.io. Enable Firebase Storage, then re-run with --apply to re-host them before decommissioning Sanity.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
