import { NextResponse } from "next/server";
import {
  isAllowedAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin/auth";
import { getAdminAuth } from "@/lib/firebase/admin";

// Exchanges a fresh Firebase ID token (from Google sign-in) for an httpOnly
// session cookie. The browser never holds a long-lived credential in JS.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const auth = getAdminAuth();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!isAllowedAdmin(decoded.email, decoded.email_verified)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let sessionCookie: string;
  try {
    // Firebase rejects tokens older than 5 minutes, so this needs a fresh sign-in.
    sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch {
    return NextResponse.json({ error: "Could not create session" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
