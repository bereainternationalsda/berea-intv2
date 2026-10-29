import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { getAdminAuth, getBucket, isFirebaseConfigured } from "@/lib/firebase/admin";

// Files are uploaded from the browser straight to Firebase Storage (a server
// request on this host can't carry a large PowerPoint). This gives a signed-in
// content manager a short-lived permission slip for that: a Firebase token
// carrying `uploader` and an `uploadUntil` time, which storage.rules checks.
// Nothing here lets anyone read, list or change existing files.

const UPLOAD_WINDOW_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!isFirebaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const uploadUntil = Math.floor(Date.now() / 1000) + UPLOAD_WINDOW_SECONDS;
  const token = await getAdminAuth().createCustomToken(`uploader-${session.uid}`, {
    uploader: true,
    uploadUntil,
  });

  return NextResponse.json(
    { token, bucket: getBucket().name },
    { headers: { "Cache-Control": "no-store" } },
  );
}
