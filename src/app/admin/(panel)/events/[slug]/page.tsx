import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "@/components/admin/DeleteEventButton";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { countAdminRegistrations, getAdminEvent } from "@/lib/admin/data";
import { isPageAvailable, todayInSA } from "@/lib/events/dates";

export const metadata = { title: "Edit event" };

export default async function AdminEventEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { slug } = await params;
  const { blocked } = await searchParams;

  const event = await getAdminEvent(slug);
  if (!event) notFound();

  const registrationCount = await countAdminRegistrations(slug);
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
        {blocked === "registrations" && (
          <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            This event wasn&rsquo;t deleted because it still has registrations. Download them,
            delete them, and then you can delete the event.
          </p>
        )}

        {(event.registrationEnabled || registrationCount > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="font-semibold text-navy-900">Registrations</h2>
              <p className="mt-1 text-sm text-navy-700/80">
                {registrationCount === 0
                  ? "No one has registered yet."
                  : `${registrationCount} ${registrationCount === 1 ? "registration" : "registrations"} so far.`}
              </p>
            </div>
            <Link
              href={`/admin/events/${event.slug}/registrations`}
              className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              View &amp; export
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <EventForm mode="edit" initial={event} />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy-900">Delete this event</h2>
          {registrationCount > 0 ? (
            <p className="mt-1 text-sm text-navy-700/80">
              This event has {registrationCount}{" "}
              {registrationCount === 1 ? "registration" : "registrations"}, so it can&rsquo;t be
              deleted yet. Download them and delete them first, or untick
              &ldquo;Published&rdquo; to take the event off the website without deleting it.
            </p>
          ) : (
            <>
              <p className="mb-4 mt-1 text-sm text-navy-700/80">
                Removes the event and its poster for good. To take it off the website but keep
                it, untick &ldquo;Published&rdquo; instead.
              </p>
              <DeleteEventButton slug={event.slug} title={event.title} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
