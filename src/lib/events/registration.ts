// Registration rules, shared by the website form (instant feedback) and the
// server (which re-checks everything, since a browser can't be trusted).
// Safe to import from client and server code.

import { isValidPhone } from "./dates.ts";

// ---- vocabulary ------------------------------------------------------------

export const REGISTRATION_TYPES = ["individual", "family", "group"] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_TYPE_INFO: Record<
  RegistrationType,
  { label: string; hint: string }
> = {
  individual: { label: "Individual", hint: "Registering one person" },
  family: { label: "Family", hint: "Parents and children, up to 20 people" },
  group: { label: "Group", hint: "A club, church or other group" },
};

/** What the public registration form shows after each attempt. */
export type RegistrationState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string>; at: number }
  | { status: "success"; reference: string; people: number; at: number };

/** An event's allowed types, tolerating old events that never stored any. */
export function allowedRegistrationTypes(
  stored?: readonly string[],
): RegistrationType[] {
  const valid = REGISTRATION_TYPES.filter((type) => stored?.includes(type));
  return valid.length > 0 ? valid : [...REGISTRATION_TYPES];
}

/** Adults give an age range (more private, and enough for planning). */
export const ADULT_AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "56-65", "66+"] as const;

export const PEOPLE_LIMITS: Record<RegistrationType, { min: number; max: number }> = {
  individual: { min: 1, max: 1 },
  family: { min: 2, max: 20 },
  group: { min: 2, max: 200 },
};
export const MAX_ATTENDEES = 200;

/** Stored on every registration, so we know which wording the person agreed to. */
export const PRIVACY_NOTICE_VERSION = "2026-10-v1";

export type AttendeeCategory = "adult" | "child";

/** What the form holds while someone is typing: everything is a string. */
export type AttendeeDraft = {
  name: string;
  category: "" | AttendeeCategory;
  age: string;
  ageRange: string;
  dietary: string;
};

/** A checked attendee, ready to store. */
export type Attendee = {
  name: string;
  category: AttendeeCategory;
  age?: number;
  ageRange?: string;
  dietary?: string;
};

export type RegistrationInput = {
  type: RegistrationType;
  groupName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emergencyName?: string;
  emergencyPhone?: string;
  attendees: Attendee[];
};

export type ValidationResult =
  | { ok: true; value: RegistrationInput }
  | { ok: false; errors: Record<string, string> };

// ---- helpers ---------------------------------------------------------------

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/** Trim, drop control characters, collapse runs of whitespace. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "18 - 25", "18–25" and "18 to 25" all become "18-25"; unknown text gives null. */
export function normaliseAgeRange(value: unknown): string | null {
  const text = cleanText(value)
    .toLowerCase()
    .replace(/\s*(–|—|to)\s*/g, "-")
    .replace(/\s+/g, "")
    .replace(/^(over|above)(\d+)$/, "$2+");
  return (ADULT_AGE_RANGES as readonly string[]).includes(text) ? text : null;
}

/** The adult range an exact age falls in (used when an Excel sheet gives a number). */
export function ageRangeForAge(age: number): string | null {
  if (age < 18) return null;
  if (age >= 66) return "66+";
  return ADULT_AGE_RANGES.find((range) => {
    const [from, to] = range.split("-").map(Number);
    return age >= from && age <= to;
  }) ?? null;
}

export function parseAge(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const text = cleanText(value);
  return /^\d{1,3}$/.test(text) ? Number(text) : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- validation ------------------------------------------------------------

type ValidateOptions = {
  /** The types this event accepts. Defaults to all three. */
  allowedTypes?: readonly RegistrationType[];
};

export function validateRegistration(
  input: unknown,
  { allowedTypes = REGISTRATION_TYPES }: ValidateOptions = {},
): ValidationResult {
  const errors: Record<string, string> = {};
  const raw = isRecord(input) ? input : {};

  // -- type
  const type = (REGISTRATION_TYPES as readonly unknown[]).includes(raw.type)
    ? (raw.type as RegistrationType)
    : undefined;
  if (!type) {
    errors.type = "Choose how you are registering.";
  } else if (!allowedTypes.includes(type)) {
    errors.type = `This event doesn't take ${REGISTRATION_TYPE_INFO[type].label.toLowerCase()} registrations.`;
  }

  // -- contact person
  const contactName = cleanText(raw.contactName);
  if (!contactName) errors.contactName = "Enter your name.";
  else if (contactName.length > 80) errors.contactName = "That name is too long.";

  const contactPhone = cleanText(raw.contactPhone);
  if (!contactPhone) errors.contactPhone = "Enter a phone number.";
  else if (!isValidPhone(contactPhone)) errors.contactPhone = "Enter a valid phone number, e.g. 082 123 4567.";

  const contactEmail = cleanText(raw.contactEmail).toLowerCase();
  if (!contactEmail) errors.contactEmail = "Enter your email address.";
  else if (contactEmail.length > 120 || !EMAIL.test(contactEmail)) {
    errors.contactEmail = "Enter a valid email address.";
  }

  const groupName = cleanText(raw.groupName);
  if (type === "group") {
    if (!groupName) errors.groupName = "Enter the name of your group.";
    else if (groupName.length > 80) errors.groupName = "That name is too long.";
  }

  // -- attendees
  const rawAttendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  const attendees: Attendee[] = [];

  const limits = type ? PEOPLE_LIMITS[type] : { min: 1, max: MAX_ATTENDEES };
  if (rawAttendees.length < limits.min || rawAttendees.length > limits.max) {
    errors.attendees =
      type === "individual"
        ? "An individual registration is for one person."
        : `A ${type ?? "registration"} needs between ${limits.min} and ${limits.max} people.`;
  }

  rawAttendees.slice(0, MAX_ATTENDEES).forEach((item, index) => {
    const row = isRecord(item) ? item : {};
    const key = `attendees.${index}`;

    const name = cleanText(row.name);
    if (!name) errors[`${key}.name`] = "Enter this person's name.";
    else if (name.length > 80) errors[`${key}.name`] = "That name is too long.";

    const dietary = cleanText(row.dietary);
    if (dietary.length > 200) errors[`${key}.dietary`] = "Please keep this under 200 characters.";

    const category = row.category === "adult" || row.category === "child" ? row.category : undefined;
    if (!category) {
      errors[`${key}.category`] = "Choose adult or child.";
      return;
    }

    const attendee: Attendee = { name, category };
    if (dietary) attendee.dietary = dietary;

    if (category === "child") {
      const age = parseAge(row.age);
      if (age === null || age < 0 || age > 17) {
        errors[`${key}.age`] = "Enter the child's age (0 to 17).";
      } else {
        attendee.age = age;
      }
    } else if (cleanText(row.ageRange)) {
      const range = normaliseAgeRange(row.ageRange);
      if (range) attendee.ageRange = range;
      else errors[`${key}.ageRange`] = "Choose an age range from the list.";
    }

    attendees.push(attendee);
  });

  // -- emergency contact: needed whenever a child is coming
  const emergencyName = cleanText(raw.emergencyName);
  const emergencyPhone = cleanText(raw.emergencyPhone);
  const anyChild = rawAttendees.some((item) => isRecord(item) && item.category === "child");
  if (anyChild || emergencyName || emergencyPhone) {
    if (!emergencyName) {
      errors.emergencyName = anyChild
        ? "Enter an emergency contact (someone other than you if possible)."
        : "Enter the emergency contact's name.";
    } else if (emergencyName.length > 80) {
      errors.emergencyName = "That name is too long.";
    }
    if (!emergencyPhone) errors.emergencyPhone = "Enter the emergency contact's phone number.";
    else if (!isValidPhone(emergencyPhone)) errors.emergencyPhone = "Enter a valid phone number.";
  }

  // -- consent
  if (raw.consent !== true) {
    errors.consent = "Please tick the box to confirm you have read the privacy notice.";
  }

  if (Object.keys(errors).length > 0 || !type) return { ok: false, errors };

  return {
    ok: true,
    value: {
      type,
      ...(type === "group" ? { groupName } : {}),
      contactName,
      contactPhone,
      contactEmail,
      ...(emergencyName ? { emergencyName, emergencyPhone } : {}),
      attendees,
    },
  };
}

// ---- stored registrations and planning stats -------------------------------

export type StoredRegistration = {
  /** The reference code, e.g. BRN-7K3QWM */
  id: string;
  type: RegistrationType;
  groupName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emergencyName?: string;
  emergencyPhone?: string;
  attendees: Attendee[];
  paid: boolean;
  /** ISO timestamp */
  createdAt: string;
};

export type RegistrationSummary = {
  registrations: number;
  people: number;
  adults: number;
  children: number;
  paid: number;
  unpaid: number;
  /** People who gave dietary needs or allergies. */
  withDietaryNeeds: number;
  byType: Record<RegistrationType, number>;
  /** Children grouped by exact age, youngest first: handy for splitting into age groups. */
  childrenByAge: { age: number; count: number }[];
  adultsByRange: { range: string; count: number }[];
};

export function summarise(registrations: StoredRegistration[]): RegistrationSummary {
  const summary: RegistrationSummary = {
    registrations: registrations.length,
    people: 0,
    adults: 0,
    children: 0,
    paid: 0,
    unpaid: 0,
    withDietaryNeeds: 0,
    byType: { individual: 0, family: 0, group: 0 },
    childrenByAge: [],
    adultsByRange: [],
  };

  const childAges = new Map<number, number>();
  const adultRanges = new Map<string, number>();

  for (const registration of registrations) {
    summary.byType[registration.type] += 1;
    if (registration.paid) summary.paid += 1;
    else summary.unpaid += 1;

    for (const person of registration.attendees) {
      summary.people += 1;
      if (person.dietary) summary.withDietaryNeeds += 1;

      if (person.category === "child") {
        summary.children += 1;
        const age = person.age ?? -1;
        childAges.set(age, (childAges.get(age) ?? 0) + 1);
      } else {
        summary.adults += 1;
        const range = person.ageRange ?? "Not given";
        adultRanges.set(range, (adultRanges.get(range) ?? 0) + 1);
      }
    }
  }

  summary.childrenByAge = [...childAges]
    .map(([age, count]) => ({ age, count }))
    .sort((a, b) => a.age - b.age);

  const order = [...ADULT_AGE_RANGES, "Not given"] as string[];
  summary.adultsByRange = [...adultRanges]
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => order.indexOf(a.range) - order.indexOf(b.range));

  return summary;
}
