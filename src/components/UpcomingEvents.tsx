import Link from "next/link";
import { EventGrid } from "@/components/EventGrid";
import { getListedEvents } from "@/lib/events/content";

const HOMEPAGE_LIMIT = 3;

/** The homepage row. Renders nothing at all when there's nothing to promote. */
export async function UpcomingEvents() {
  const events = await getListedEvents();
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-bold text-navy-900">
            Upcoming events
          </h2>
          <p className="mt-3 text-navy-700/80">
            Camps, trainings and special programs you&rsquo;re invited to.
          </p>
        </div>
        <Link
          href="/events"
          className="text-sm font-semibold text-navy-600 hover:text-navy-800"
        >
          {events.length > HOMEPAGE_LIMIT
            ? `See all ${events.length} events →`
            : "See all events →"}
        </Link>
      </div>

      <div className="mt-10">
        <EventGrid events={events.slice(0, HOMEPAGE_LIMIT)} />
      </div>
    </section>
  );
}
