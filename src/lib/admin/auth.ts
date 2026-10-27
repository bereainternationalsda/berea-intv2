import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "admin_session";
// Firebase allows 5 minutes to 2 weeks. Admins re-authenticate after 5 days.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export type AdminSession = { uid: string; email: string; name?: string };

/**
 * Only Google accounts listed in ADMIN_EMAILS may use /admin. Fails closed:
 * an empty or missing list admits nobody. Unverified emails never qualify, so
 * nobody can claim an admin address by signing up with it unverified.
 */
export function isAllowedAdmin(email?: string, emailVerified?: boolean) {
  if (!email || !emailVerified) return false;

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

/** Returns the signed-in admin, or null. Never throws. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    // checkRevoked=true so a revoked/disabled account loses access immediately.
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    if (!isAllowedAdmin(decoded.email, decoded.email_verified)) return null;

    return {
      uid: decoded.uid,
      email: decoded.email as string,
      name: typeof decoded.name === "string" ? decoded.name : undefined,
    };
  } catch {
    return null;
  }
});

/**
 * Call this at the top of every admin page, data function and server action.
 * Server Actions are public POST endpoints, and layouts don't re-run on client
 * navigation, so the check has to live next to the data it protects.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
