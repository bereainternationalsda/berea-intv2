import { Card3D } from "@/components/Card3D";
import {
  formatEventDates,
  isHappeningNow,
  isRegistrationOpen,
  todayInSA,
} from "@/lib/events/dates";
import type { EventItem } from "@/lib/events/types";

export function EventGrid({ events }: { events: EventItem[] }) {
  const today = todayInSA();

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <Card3D
          key={event.slug}
          href={`/events/${event.slug}`}
          title={event.title}
          eyebrow={formatEventDates(event.startDate, event.endDate)}
          description={event.summary}
          footnote={event.venue ? `📍 ${event.venue}` : undefined}
          imageUrl={event.imageUrl}
          icon="📅"
          badge={
            isRegistrationOpen(event, today)
              ? "Registration open"
              : isHappeningNow(event, today)
                ? "Happening now"
                : undefined
          }
          ctaLabel="View details"
          index={index}
        />
      ))}
    </div>
  );
}
