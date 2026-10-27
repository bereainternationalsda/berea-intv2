import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "@/components/admin/DeleteEventButton";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminEvent } from "@/lib/admin/data";
import { isPageAvailable, todayInSA } from "@/lib/events/dates";

export const metadata = { title: "Edit event" };

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();

  const isViewable = isPageAvailable(event, todayInSA());

  return (
    <>
      <PageHeader
        title={event.title}
        back={{ href: "/admin/events", label: "All events" }}
        actions={
          isViewable ? (
            <Link
              href={`/events/${event.slug}`}
              target="_blank"
              className="text-sm font-semibold text-navy-600 hover:text-navy-800"
            >
              View on the website ↗
            </Link>
          ) : undefined
        }
      />
      <div className="max-w-2xl space-y-8">
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <EventForm mode="edit" initial={event} />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy-900">Delete this event</h2>
          <p className="mb-4 mt-1 text-sm text-navy-700/80">
            Removes the event and its poster for good. To take it off the website
            but keep it, untick &ldquo;Published&rdquo; instead.
          </p>
          <DeleteEventButton slug={event.slug} title={event.title} />
        </div>
      </div>
    </>
  );
}
