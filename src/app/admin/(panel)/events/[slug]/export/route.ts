import { NextResponse } from "next/server";
import writeExcelFile from "write-excel-file/node";
import { getAdminSession } from "@/lib/admin/auth";
import { getAdminEvent, getAdminRegistrations } from "@/lib/admin/data";
import { todayInSA } from "@/lib/events/dates";
import {
  buildRegistrationExport,
  exportFileName,
  formatRegistered,
} from "@/lib/events/workbooks";

// Never cache: this is personal data, and it changes as people register.
export const dynamic = "force-dynamic";

// A download, so an unauthenticated visitor gets a plain 401 instead of the
// redirect pages use. (The data functions below re-check the session as well.)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await getAdminSession())) {
    return new NextResponse("Please sign in to download registrations.", { status: 401 });
  }

  const { slug } = await params;
  const event = await getAdminEvent(slug);
  if (!event) return new NextResponse("Event not found.", { status: 404 });

  const registrations = await getAdminRegistrations(slug);
  const sheets = buildRegistrationExport(
    event,
    registrations,
    `${formatRegistered(new Date().toISOString())} (South African time)`,
  );
  const buffer = await writeExcelFile(sheets).toBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // The slug is validated (lowercase letters, digits, hyphens), so it is safe in a filename.
      "Content-Disposition": `attachment; filename="${exportFileName(slug, todayInSA())}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
