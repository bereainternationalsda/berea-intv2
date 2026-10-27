import Image from "next/image";
import Link from "next/link";
import { formatEventDates, type EventStatus } from "@/lib/events/dates";
import type { EventItem } from "@/lib/events/types";

const statusStyles: Record<EventStatus, { label: string; className: string }> = {
  live: { label: "Showing now", className: "bg-green-100 text-green-800" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800" },
  draft: { label: "Draft", className: "bg-navy-100 text-navy-800" },
  ended: { label: "Ended", className: "bg-amber-100 text-amber-800" },
};

export function EventRow({
  event,
  status,
}: {
  event: EventItem;
  status: EventStatus;
}) {
  const badge = statusStyles[status];

  return (
    <li>
      <Link
        href={`/admin/events/${event.slug}`}
        className="flex items-center gap-4 rounded-xl border border-navy-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50 text-2xl">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          ) : (
            "📅"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy-900">{event.title}</p>
          <p className="truncate text-xs text-navy-700/70">
            {formatEventDates(event.startDate, event.endDate)}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </Link>
    </li>
  );
}
