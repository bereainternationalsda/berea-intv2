import Link from "next/link";
import { EventRow } from "@/components/admin/EventRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminEvents } from "@/lib/admin/data";
import { getEventStatus, todayInSA, type EventStatus } from "@/lib/events/dates";

export const metadata = { title: "Events" };

const groups: { status: EventStatus; title: string; note?: string }[] = [
  { status: "live", title: "Showing on the website" },
  { status: "scheduled", title: "Scheduled", note: "Will appear on their start-promoting date." },
  { status: "draft", title: "Drafts", note: "Not visible to anyone yet." },
  { status: "ended", title: "Ended", note: "No longer on the website." },
];

export default async function AdminEventsPage() {
  const events = await getAdminEvents();
  const today = todayInSA();

  const withStatus = events.map((event) => ({
    event,
    status: getEventStatus(event, today),
  }));

  return (
    <>
      <PageHeader
        title="Events"
        description="Camps, trainings and other programs you want to promote."
        actions={
          <Link
            href="/admin/events/new"
            className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            + Add an event
          </Link>
        }
      />

      {events.length === 0 ? (
        <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
          <p className="text-navy-800">No events yet.</p>
          <p className="mt-1 text-sm text-navy-700/70">
            Add your first camp or training and it can appear on the homepage.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-10">
          {groups.map((group) => {
            const rows = withStatus.filter((row) => row.status === group.status);
            if (rows.length === 0) return null;
            return (
              <section key={group.status}>
                <h2 className="font-serif text-xl font-bold text-navy-900">{group.title}</h2>
                {group.note && (
                  <p className="mb-3 mt-0.5 text-sm text-navy-700/70">{group.note}</p>
                )}
                <ul className={`space-y-3 ${group.note ? "" : "mt-3"}`}>
                  {rows.map(({ event, status }) => (
                    <EventRow key={event.slug} event={event} status={status} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
