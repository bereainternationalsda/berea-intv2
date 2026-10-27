// Safe to import from server and client code.

import type { RegistrationType } from "./registration.ts";

export type EventItem = {
  slug: string;
  title: string;
  /** One or two lines shown on the card. */
  summary?: string;
  /** Full details; paragraphs separated by blank lines. */
  description?: string;
  imageUrl?: string;
  /** YYYY-MM-DD, South African calendar date. */
  startDate: string;
  /** HH:MM, 24-hour. */
  startTime?: string;
  endDate?: string;
  endTime?: string;
  venue?: string;
  /** Free text, e.g. "Adults R450, children R250". */
  costs?: string;
  contactName?: string;
  contactPhone?: string;
  /** Drafts (false) are never shown publicly. */
  published: boolean;
  /** First day the event is promoted. Blank = immediately. */
  showFrom?: string;
  /** Last day the event is promoted. Blank = the event's own last day. */
  showUntil?: string;
  /** People can register on the website. */
  registrationEnabled?: boolean;
  /** Last day to register. Blank = until the event starts. */
  registrationDeadline?: string;
  /** Which kinds of registration the event takes. Missing = all of them. */
  registrationTypes?: RegistrationType[];
};
