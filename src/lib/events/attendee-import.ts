// Turns rows read from an uploaded Excel sheet into attendee rows for the form.
// Pure and forgiving: a bad row is flagged for the person to fix, never fatal.

import {
  MAX_ATTENDEES,
  ageRangeForAge,
  cleanText,
  normaliseAgeRange,
  parseAge,
  type AttendeeDraft,
} from "./registration.ts";

/** The headings of the downloadable template (the importer also copes with variations). */
export const TEMPLATE_HEADERS = [
  "Full name",
  "Adult or child",
  "Age (children only)",
  "Age range (adults, optional)",
  "Dietary needs or allergies",
] as const;

export type ImportResult = {
  attendees: AttendeeDraft[];
  /** Plain-English notes about rows that need attention. */
  problems: string[];
  /** More rows than the limit; the extras were ignored. */
  truncated: boolean;
};

type Columns = Partial<
  Record<"name" | "category" | "age" | "ageRange" | "dietary", number>
>;

const MAX_PROBLEMS_SHOWN = 8;

/**
 * "Name", "Full name", "Full name (required)", "Participant name"... but not
 * "Surname" or "First name", which would import only part of a name.
 */
const NAME_HEADING = /^(full\s+)?names?\b|^(participant|attendee|person)('s)?\s+names?\b/;

function cellText(value: unknown): string {
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number") return String(value);
  return ""; // blank, boolean or date cells carry nothing we can use
}

/** Match headings to roles. Order matters: "Age range (adults…)" contains "adult". */
function mapColumns(header: unknown[]): Columns {
  const columns: Columns = {};
  const taken = new Set<number>();
  const roles: [keyof Columns, RegExp][] = [
    ["ageRange", /range/],
    ["age", /^age\b/],
    ["category", /adult\s*(or|\/)\s*child|category|^type$/],
    ["dietary", /diet|allerg/],
    ["name", NAME_HEADING],
  ];

  for (const [role, pattern] of roles) {
    const index = header.findIndex(
      (cell, position) => !taken.has(position) && pattern.test(cellText(cell).toLowerCase()),
    );
    if (index >= 0) {
      columns[role] = index;
      taken.add(index);
    }
  }
  return columns;
}

export function attendeesFromRows(rows: unknown[][]): ImportResult {
  const empty = (problem: string): ImportResult => ({
    attendees: [],
    problems: [problem],
    truncated: false,
  });

  // The headings might not be on the very first line (people add titles).
  const headerIndex = rows
    .slice(0, 10)
    .findIndex((row) => row.some((cell) => NAME_HEADING.test(cellText(cell).toLowerCase())));
  if (headerIndex < 0) {
    return empty(
      "We couldn't find a “Full name” column. Please use the template and keep its column headings.",
    );
  }

  const columns = mapColumns(rows[headerIndex]);
  if (columns.name === undefined) {
    return empty("We couldn't find a “Full name” column. Please use the template.");
  }

  const attendees: AttendeeDraft[] = [];
  const problems: string[] = [];
  let truncated = false;
  const get = (row: unknown[], column?: number) =>
    column === undefined ? "" : cellText(row[column]);

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const excelRow = headerIndex + offset + 2; // 1-based, as Excel numbers rows
    const name = get(row, columns.name);
    const categoryRaw = get(row, columns.category);
    const categoryText = categoryRaw.toLowerCase();
    const ageText = get(row, columns.age);
    const rangeText = get(row, columns.ageRange);
    const dietary = get(row, columns.dietary);

    if (![name, categoryText, ageText, rangeText, dietary].some(Boolean)) return; // blank row
    if (attendees.length >= MAX_ATTENDEES) {
      truncated = true;
      return;
    }

    const age = parseAge(ageText);

    // Adult or child: said outright, otherwise worked out from the age.
    let category: AttendeeDraft["category"] = "";
    if (/^c|^k/.test(categoryText)) category = "child";
    else if (/^a/.test(categoryText)) category = "adult";
    else if (categoryText) problems.push(`Row ${excelRow}: we couldn't tell if “${categoryRaw}” means adult or child. Please choose.`);
    else if (age !== null) category = age < 18 ? "child" : "adult";
    else if (rangeText) category = "adult";

    let ageRange = "";
    if (rangeText) {
      const range = normaliseAgeRange(rangeText);
      if (range) ageRange = range;
      else problems.push(`Row ${excelRow}: we couldn't read the age range “${rangeText}”. Please choose one.`);
    }

    let ageValue = "";
    if (category === "adult") {
      // An adult's exact age is turned into the matching range.
      if (!ageRange && age !== null) ageRange = ageRangeForAge(age) ?? "";
    } else if (age !== null) {
      ageValue = String(age);
    } else if (category === "child" && ageText) {
      problems.push(`Row ${excelRow}: we couldn't read the age “${ageText}”.`);
    }

    attendees.push({ name, category, age: ageValue, ageRange, dietary });
  });

  const shown = problems.slice(0, MAX_PROBLEMS_SHOWN);
  if (problems.length > shown.length) {
    shown.push(`…and ${problems.length - shown.length} more.`);
  }
  if (attendees.length === 0 && shown.length === 0) {
    shown.push("The spreadsheet has no people in it yet.");
  }

  return { attendees, problems: shown, truncated };
}
