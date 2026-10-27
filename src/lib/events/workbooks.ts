// Builds the data for the two Excel files: the blank attendee template people
// download, and the planning export for the content manager. Pure (no file I/O):
// the caller hands the result to write-excel-file.
//
// Every piece of user-supplied text is an explicit *String* cell. A name such as
// "=1+1" is therefore stored as text, never as a formula, and phone numbers keep
// their leading "+" and zeros. (CSV can't promise either, which is why this is xlsx.)

import { EVENT_TIME_ZONE, formatEventDates } from "./dates.ts";
import { ADULT_AGE_RANGES, REGISTRATION_TYPE_INFO, summarise, type StoredRegistration } from "./registration.ts";
import { TEMPLATE_HEADERS } from "./attendee-import.ts";

export type Cell = null | {
  value: string | number;
  type?: StringConstructor | NumberConstructor;
  fontWeight?: "bold";
  backgroundColor?: string;
  wrap?: boolean;
  fontSize?: number;
};
export type SheetSpec = {
  sheet: string;
  data: Cell[][];
  columns: { width: number }[];
  stickyRowsCount?: number;
};

const HEADER_FILL = "#e7ecf3";

const text = (value?: string | null): Cell =>
  value ? { type: String, value } : null;
const num = (value?: number): Cell =>
  value === undefined ? null : { type: Number, value };
const heading = (value: string): Cell => ({
  type: String,
  value,
  fontWeight: "bold",
  backgroundColor: HEADER_FILL,
  wrap: true,
});
const bold = (value: string): Cell => ({ type: String, value, fontWeight: "bold" });
const widths = (...w: number[]) => w.map((width) => ({ width }));

/** "2026-10-27 14:30" in South African time. */
export function formatRegistered(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

// ---- the blank template people download ------------------------------------

export function buildTemplateSheets(): SheetSpec[] {
  const instructions: string[] = [
    "How to use this template",
    "",
    "1. On the “Attendees” sheet, fill in one row for each person who is coming.",
    "2. Save the file, then upload it on the registration page. You can still edit anyone afterwards.",
    "",
    "Columns",
    "• Full name — required.",
    "• Adult or child — type Adult or Child.",
    "• Age (children only) — a whole number from 0 to 17. Required for children.",
    `• Age range (adults, optional) — one of: ${ADULT_AGE_RANGES.join(", ")}.`,
    "• Dietary needs or allergies — optional, e.g. Vegetarian, or Peanut allergy.",
    "",
    "Please don't rename the column headings on the “Attendees” sheet.",
  ];

  return [
    {
      sheet: "Attendees",
      data: [TEMPLATE_HEADERS.map(heading)],
      columns: widths(28, 16, 20, 28, 34),
      stickyRowsCount: 1,
    },
    {
      sheet: "Instructions",
      data: instructions.map((line, index) => [
        index === 0 || line === "Columns" ? bold(line) : text(line),
      ]),
      columns: widths(100),
    },
  ];
}

// ---- the planning export for the content manager ---------------------------

type ExportEvent = { title: string; startDate: string; endDate?: string };

export function buildRegistrationExport(
  event: ExportEvent,
  registrations: StoredRegistration[],
  generatedAt: string,
): SheetSpec[] {
  const sorted = [...registrations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const summary = summarise(sorted);
  const yesNo = (paid: boolean) => (paid ? "Yes" : "No");
  const emergency = (r: StoredRegistration) =>
    [text(r.emergencyName), text(r.emergencyPhone)] as const;

  // -- Summary
  const pair = (label: string, value: number | string): Cell[] => [
    text(label),
    typeof value === "number" ? num(value) : text(value),
  ];
  const summaryRows: Cell[][] = [
    [bold(event.title)],
    [text(formatEventDates(event.startDate, event.endDate))],
    [text(`Exported ${generatedAt}`)],
    [],
    [heading("Totals"), heading("")],
    pair("Registrations", summary.registrations),
    pair("People coming", summary.people),
    pair("Adults", summary.adults),
    pair("Children", summary.children),
    pair("Registrations marked paid", summary.paid),
    pair("Registrations not yet paid", summary.unpaid),
    pair("People with dietary needs or allergies", summary.withDietaryNeeds),
    [],
    [heading("Registration type"), heading("Registrations")],
    ...(Object.keys(REGISTRATION_TYPE_INFO) as (keyof typeof summary.byType)[]).map((type) =>
      pair(REGISTRATION_TYPE_INFO[type].label, summary.byType[type]),
    ),
    [],
    [heading("Children by age"), heading("Children")],
    ...(summary.childrenByAge.length
      ? summary.childrenByAge.map(({ age, count }) => pair(`Age ${age}`, count))
      : [pair("None", 0)]),
    [],
    [heading("Adults by age range"), heading("Adults")],
    ...(summary.adultsByRange.length
      ? summary.adultsByRange.map(({ range, count }) => pair(range, count))
      : [pair("None", 0)]),
  ];

  // -- People: one row per person, the sheet to plan tents, meals and groups from
  const peopleRows: Cell[][] = [
    [
      "Reference", "Registered", "Registration type", "Group name",
      "Contact name", "Contact phone", "Contact email",
      "Emergency contact", "Emergency phone",
      "Person", "Adult or child", "Age", "Age range", "Dietary needs or allergies", "Paid",
    ].map(heading),
  ];
  for (const r of sorted) {
    for (const person of r.attendees) {
      peopleRows.push([
        text(r.id), text(formatRegistered(r.createdAt)),
        text(REGISTRATION_TYPE_INFO[r.type].label), text(r.groupName),
        text(r.contactName), text(r.contactPhone), text(r.contactEmail),
        ...emergency(r),
        text(person.name), text(person.category === "child" ? "Child" : "Adult"),
        num(person.age), text(person.ageRange), text(person.dietary),
        text(yesNo(r.paid)),
      ]);
    }
  }

  // -- Registrations: one row per sign-up, to chase payments and contact people
  const registrationRows: Cell[][] = [
    [
      "Reference", "Registered", "Registration type", "Group name",
      "Contact name", "Contact phone", "Contact email",
      "Emergency contact", "Emergency phone",
      "People", "Adults", "Children", "Paid",
    ].map(heading),
  ];
  for (const r of sorted) {
    const adults = r.attendees.filter((p) => p.category === "adult").length;
    registrationRows.push([
      text(r.id), text(formatRegistered(r.createdAt)),
      text(REGISTRATION_TYPE_INFO[r.type].label), text(r.groupName),
      text(r.contactName), text(r.contactPhone), text(r.contactEmail),
      ...emergency(r),
      num(r.attendees.length), num(adults), num(r.attendees.length - adults),
      text(yesNo(r.paid)),
    ]);
  }

  return [
    { sheet: "Summary", data: summaryRows, columns: widths(42, 16) },
    {
      sheet: "People",
      data: peopleRows,
      columns: widths(13, 17, 14, 22, 22, 17, 28, 22, 17, 26, 13, 7, 11, 32, 7),
      stickyRowsCount: 1,
    },
    {
      sheet: "Registrations",
      data: registrationRows,
      columns: widths(13, 17, 14, 22, 22, 17, 28, 22, 17, 8, 8, 9, 7),
      stickyRowsCount: 1,
    },
  ];
}

/** e.g. registrations-youth-camp-2026-2026-10-27.xlsx */
export function exportFileName(slug: string, today: string): string {
  return `registrations-${slug}-${today}.xlsx`;
}
