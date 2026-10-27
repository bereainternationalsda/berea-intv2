import { EventGrid } from "@/components/EventGrid";
import { getListedEvents } from "@/lib/events/content";

export const metadata = {
  title: "Events | Berea International SDA",
  description: "Camps, trainings and special programs at Berea International SDA Church.",
};

// Re-render at most once a minute, so events appear and expire on their dates
// without a redeploy.
export const revalidate = 60;

export default async function EventsPage() {
  const events = await getListedEvents();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-bold text-navy-900">Events</h1>
        <p className="mt-3 text-navy-700/80">
          Camps, trainings and special programs you&rsquo;re invited to.
        </p>
      </div>

      <div className="mt-12">
        {events.length === 0 ? (
          <p className="text-center text-navy-700/70">
            There are no events being promoted right now. Please check back soon.
          </p>
        ) : (
          <EventGrid events={events} />
        )}
      </div>
    </section>
  );
}
