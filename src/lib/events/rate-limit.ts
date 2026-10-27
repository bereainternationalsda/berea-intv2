import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/lib/firebase/admin";

const WINDOW_SECONDS = 60 * 60;

/**
 * Registrations allowed per connection per hour. Deliberately generous: a whole
 * church hall may register from one Wi-Fi network at the same time. This blunts
 * abuse; it isn't meant to stop a determined attacker.
 */
export const REGISTRATIONS_PER_HOUR =
  Number(process.env.REGISTRATION_RATE_LIMIT_PER_HOUR) || 40;

async function clientAddress(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one more attempt from this connection and says whether it's allowed.
 * Only a salted hash of the address is stored (an IP address is personal
 * information), in short-lived counters that can be expired with a Firestore
 * TTL policy on `expireAt`.
 */
export async function allowAttempt(scope: string, limit: number): Promise<boolean> {
  const hash = createHash("sha256")
    .update(`${process.env.FIREBASE_PROJECT_ID ?? ""}:${await clientAddress()}`)
    .digest("hex")
    .slice(0, 32);
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));

  const db = getDb();
  const ref = db.collection("rateLimits").doc(`${scope}-${bucket}-${hash}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = ((snapshot.get("count") as number | undefined) ?? 0) + 1;
    if (count > limit) return false;

    transaction.set(ref, {
      count,
      expireAt: new Date((bucket + 2) * WINDOW_SECONDS * 1000),
    });
    return true;
  });
}
