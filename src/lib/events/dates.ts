// Pure date helpers for events. No imports, so they work on the server, in the
// browser, and in a plain Node test script.
//
// Event dates are stored as "YYYY-MM-DD" strings (no time zone), and "today" is
// always worked out in South African time, so an event appears and disappears
// at midnight in Johannesburg no matter where the server runs.

export const EVENT_TIME_ZONE = "Africa/Johannesburg";

export type EventDates = {
  published: boolean;
  startDate: string;
  endDate?: string;
  showFrom?: string;
  showUntil?: string;
};

export type EventStatus = "draft" | "scheduled" | "live" | "ended";

/** Today's date in South Africa, as YYYY-MM-DD. */
export function todayInSA(now: Date = new Date()): string {
  // The "en-CA" locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ---- validation ----------------------------------------------------------

export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 2000 || year > 2100) return false;

  // Reject impossible dates such as 2026-02-31.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** South African numbers are often written with spaces, dashes or a +27. */
export function isValidPhone(value: string): boolean {
  if (!/^[+()\d\s-]{7,30}$/.test(value)) return false;
  return value.replace(/\D/g, "").length >= 7;
}

// ---- visibility rules ----------------------------------------------------

/** The last day the event is listed: showUntil, else the event's own last day. */
export function lastListedDate(event: EventDates): string {
  return event.showUntil ?? event.endDate ?? event.startDate;
}

export function hasEnded(event: EventDates, today: string): boolean {
  return today > (event.endDate ?? event.startDate);
}

export function isHappeningNow(event: EventDates, today: string): boolean {
  return today >= event.startDate && !hasEnded(event, today);
}

/** The event's own page can be opened (published, and past its "show from" date). */
export function isPageAvailable(event: EventDates, today: string): boolean {
  return event.published && (!event.showFrom || today >= event.showFrom);
}

/** The event appears in the homepage row and on /events. */
export function isListed(event: EventDates, today: string): boolean {
  return isPageAvailable(event, today) && today <= lastListedDate(event);
}

/** A label for the admin list. */
export function getEventStatus(event: EventDates, today: string): EventStatus {
  if (!event.published) return "draft";
  if (event.showFrom && today < event.showFrom) return "scheduled";
  if (today > lastListedDate(event)) return "ended";
  return "live";
}

export function byStartDate<T extends { startDate: string; title: string }>(
  a: T,
  b: T,
): number {
  return a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title);
}

// ---- display -------------------------------------------------------------

// Parse as UTC and format as UTC, so the weekday can't shift with the viewer's
// time zone. The pieces are joined by hand because Intl inserts a comma after the
// weekday only when a year is present, which makes ranges look inconsistent.
function dateParts(value: string, weekday: "short" | "long", month: "short" | "long") {
  const [year, monthIndex, day] = value.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday,
    day: "numeric",
    month,
  }).formatToParts(new Date(Date.UTC(year, monthIndex - 1, day)));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return { weekday: pick("weekday"), day: pick("day"), month: pick("month"), year: String(year) };
}

/** "Saturday 14 February 2026" or "Sat 14 Feb – Mon 16 Feb 2026". */
export function formatEventDates(startDate: string, endDate?: string): string {
  if (!endDate || endDate === startDate) {
    const d = dateParts(startDate, "long", "long");
    return `${d.weekday} ${d.day} ${d.month} ${d.year}`;
  }

  const start = dateParts(startDate, "short", "short");
  const end = dateParts(endDate, "short", "short");
  // Only repeat the year on the first date when the event spans two years.
  const startYear = start.year === end.year ? "" : ` ${start.year}`;

  return (
    `${start.weekday} ${start.day} ${start.month}${startYear} – ` +
    `${end.weekday} ${end.day} ${end.month} ${end.year}`
  );
}

/** "09:00 – 13:00", "From 09:00", or "" when no times are set. */
export function formatEventTimes(startTime?: string, endTime?: string): string {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return `From ${startTime}`;
  if (endTime) return `Until ${endTime}`;
  return "";
}
