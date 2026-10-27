"use server";

import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { SLUG_RE } from "@/lib/admin/validation";
import { getDb } from "@/lib/firebase/admin";
import { getPublicEvent } from "@/lib/events/content";
import { isRegistrationOpen, todayInSA } from "@/lib/events/dates";
import { REGISTRATIONS_PER_HOUR, allowAttempt } from "@/lib/events/rate-limit";
import {
  PRIVACY_NOTICE_VERSION,
  allowedRegistrationTypes,
  validateRegistration,
  type RegistrationState,
} from "@/lib/events/registration";

// This is a PUBLIC endpoint: anyone on the internet can call it. So it trusts
// nothing from the browser: the event, the rules and every field are re-checked here.

const MAX_PAYLOAD_CHARACTERS = 150_000; // ~200 people with room to spare

// No 0/O or 1/I, so a code read out over the phone isn't misheard.
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newReference(): string {
  const characters = Array.from(
    { length: 6 },
    () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)],
  );
  return `BRN-${characters.join("")}`;
}

function failure(message: string, fieldErrors?: Record<string, string>): RegistrationState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

export async function registerForEvent(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  // 1. Honeypot: real people never see this field. A bot that fills it in gets a
  //    convincing "success" so it doesn't learn it was caught, but nothing is saved.
  if (formData.get("website")) {
    return { status: "success", reference: newReference(), people: 1, at: Date.now() };
  }

  // 2. The raw request
  const slug = formData.get("eventSlug");
  const payloadText = formData.get("payload");
  if (typeof slug !== "string" || !SLUG_RE.test(slug) || typeof payloadText !== "string") {
    return failure("Something went wrong. Please refresh the page and try again.");
  }
  if (payloadText.length > MAX_PAYLOAD_CHARACTERS) {
    return failure("That registration is too large. Please split it into two.");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return failure("Something went wrong. Please refresh the page and try again.");
  }

  // 3. Is this event taking registrations right now?
  const event = await getPublicEvent(slug);
  if (!event || !isRegistrationOpen(event, todayInSA())) {
    return failure("Registration for this event is closed.");
  }

  // 4. The rules (the same ones the form used for instant feedback)
  const result = validateRegistration(payload, {
    allowedTypes: allowedRegistrationTypes(event.registrationTypes),
  });
  if (!result.ok) {
    return failure("Please fix the highlighted fields.", result.errors);
  }

  // 5. Throttle. Counted only now, so fumbling the form never uses up the allowance.
  if (!(await allowAttempt(`registration-${slug}`, REGISTRATIONS_PER_HOUR))) {
    return failure(
      "There have been too many registrations from your connection. Please try again in an hour, or contact the organiser.",
    );
  }

  // 6. Save under a unique reference code (retry on the rare clash)
  const { attendees } = result.value;
  const children = attendees.filter((person) => person.category === "child").length;
  const registrations = getDb().collection("events").doc(slug).collection("registrations");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = newReference();
    try {
      await registrations.doc(reference).create({
        ...result.value,
        peopleCount: attendees.length,
        adultCount: attendees.length - children,
        childCount: children,
        paid: false,
        consent: true,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { status: "success", reference, people: attendees.length, at: Date.now() };
    } catch (error) {
      if ((error as { code?: number }).code === 6) continue; // ALREADY_EXISTS: pick another code
      console.error("Registration could not be saved:", error);
      return failure("We couldn't save your registration. Please try again in a moment.");
    }
  }

  return failure("We couldn't save your registration. Please try again in a moment.");
}
