"use client";

import { useActionState, useState } from "react";
import { saveEvent } from "@/app/admin/(panel)/actions";
import {
  CheckboxField,
  StatusBanner,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { idleState } from "@/lib/admin/types";
import { slugify } from "@/lib/admin/validation";
import {
  formatEventDates,
  isValidDateString,
  lastListedDate,
  previousDay,
} from "@/lib/events/dates";
import {
  REGISTRATION_TYPES,
  REGISTRATION_TYPE_INFO,
  allowedRegistrationTypes,
  type RegistrationType,
} from "@/lib/events/registration";
import type { EventItem } from "@/lib/events/types";

type EventFormProps = {
  mode: "create" | "edit";
  initial: EventItem;
};

/** A plain-English line so a wrong date is obvious before saving. */
function promotionSummary(values: {
  published: boolean;
  startDate: string;
  endDate: string;
  showFrom: string;
  showUntil: string;
}): string {
  if (!values.published) {
    return "This is a draft. It will not appear on the website.";
  }
  if (!isValidDateString(values.startDate)) {
    return "Enter the event's start date to see when it will be promoted.";
  }
  if (isValidDateString(values.endDate) && values.endDate < values.startDate) {
    return "⚠ The end date is before the start date. Please check the dates.";
  }
  if (
    isValidDateString(values.showFrom) &&
    isValidDateString(values.showUntil) &&
    values.showUntil < values.showFrom
  ) {
    return "⚠ “Stop promoting after” is earlier than “Start promoting on”. Please check the dates.";
  }

  const last = lastListedDate({
    published: true,
    startDate: values.startDate,
    endDate: isValidDateString(values.endDate) ? values.endDate : undefined,
    showUntil: isValidDateString(values.showUntil) ? values.showUntil : undefined,
  });
  const from = isValidDateString(values.showFrom)
    ? `from ${formatEventDates(values.showFrom)}`
    : "straight away";

  return `It will appear on the website ${from}, and is removed after ${formatEventDates(last)}.`;
}

/** What the registration settings add up to, in plain English. */
function registrationSummary(values: {
  enabled: boolean;
  types: RegistrationType[];
  startDate: string;
  endDate: string;
  deadline: string;
}): string {
  if (!values.enabled) {
    return "Registration is switched off. The event page will show the details only.";
  }
  if (values.types.length === 0) return "⚠ Tick at least one kind of registration.";
  if (!isValidDateString(values.startDate)) {
    return "Enter the event's start date to see when registration closes.";
  }

  const eventEnd = isValidDateString(values.endDate) && values.endDate >= values.startDate
    ? values.endDate
    : values.startDate;
  if (isValidDateString(values.deadline)) {
    if (values.deadline > eventEnd) {
      return "⚠ The last day to register is after the event has finished. Please check the date.";
    }
    return `People can register until the end of ${formatEventDates(values.deadline)}.`;
  }
  return `Registration closes when the event starts. The last day to register is ${formatEventDates(previousDay(values.startDate))}.`;
}

export function EventForm({ mode, initial }: EventFormProps) {
  const isCreate = mode === "create";
  const [state, action, pending] = useActionState(saveEvent, idleState);
  const [imageBusy, setImageBusy] = useState(false);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime ?? "");
  const [endDate, setEndDate] = useState(initial.endDate ?? "");
  const [endTime, setEndTime] = useState(initial.endTime ?? "");
  const [venue, setVenue] = useState(initial.venue ?? "");
  const [costs, setCosts] = useState(initial.costs ?? "");
  const [contactName, setContactName] = useState(initial.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? "");
  const [published, setPublished] = useState(initial.published);
  const [showFrom, setShowFrom] = useState(initial.showFrom ?? "");
  const [showUntil, setShowUntil] = useState(initial.showUntil ?? "");
  const [registrationEnabled, setRegistrationEnabled] = useState(
    initial.registrationEnabled ?? false,
  );
  const [allowedTypes, setAllowedTypes] = useState<RegistrationType[]>(
    allowedRegistrationTypes(initial.registrationTypes),
  );
  const [registrationDeadline, setRegistrationDeadline] = useState(
    initial.registrationDeadline ?? "",
  );

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const resetKey = state.status === "idle" ? "idle" : state.at;

  function handleTitleChange(value: string) {
    setTitle(value);
    if (isCreate && !slugEdited) setSlug(slugify(value));
  }

  return (
    <form action={action} className="space-y-8">
      <StatusBanner state={state} />

      <input type="hidden" name="mode" value={mode} />
      {!isCreate && <input type="hidden" name="slug" value={initial.slug} />}

      <section className="space-y-6">
        <TextField
          name="title"
          label="Event name"
          value={title}
          onChange={handleTitleChange}
          maxLength={100}
          required
          error={errors.title}
        />

        {isCreate && (
          <TextField
            name="slug"
            label="Web address"
            hint={`This event's page will be at /events/${slug || "your-event-name"}. It can't be changed after you create the event.`}
            value={slug}
            onChange={(value) => {
              setSlugEdited(true);
              setSlug(slugify(value));
            }}
            maxLength={60}
            error={errors.slug}
          />
        )}

        <TextAreaField
          name="summary"
          label="Short summary"
          hint="One or two lines shown on the event's card."
          value={summary}
          onChange={setSummary}
          maxLength={200}
          rows={2}
          error={errors.summary}
        />

        <TextAreaField
          name="description"
          label="Details"
          hint="Everything people need to know. Leave a blank line between paragraphs."
          value={description}
          onChange={setDescription}
          maxLength={5000}
          rows={8}
          error={errors.description}
        />

        {/* Re-mounted after every response, because React clears the file input. */}
        <ImageField
          key={resetKey}
          label="Poster or photo"
          hint="Cards show a cropped 4:3 preview; the event's own page shows the whole image, so a full poster works well."
          currentUrl={initial.imageUrl}
          error={errors.image}
          onBusyChange={setImageBusy}
        />
      </section>

      <section className="space-y-6 border-t border-navy-100 pt-8">
        <h2 className="font-serif text-xl font-bold text-navy-900">When and where</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            name="startDate"
            label="Starts on"
            type="date"
            value={startDate}
            onChange={setStartDate}
            required
            error={errors.startDate}
          />
          <TextField
            name="startTime"
            label="Start time (optional)"
            type="time"
            value={startTime}
            onChange={setStartTime}
            error={errors.startTime}
          />
          <TextField
            name="endDate"
            label="Ends on (optional)"
            hint="Leave blank for a one-day event."
            type="date"
            value={endDate}
            onChange={setEndDate}
            error={errors.endDate}
          />
          <TextField
            name="endTime"
            label="End time (optional)"
            type="time"
            value={endTime}
            onChange={setEndTime}
            error={errors.endTime}
          />
        </div>

        <TextField
          name="venue"
          label="Venue"
          hint="Name and address, as people would type it into a map."
          value={venue}
          onChange={setVenue}
          maxLength={150}
          error={errors.venue}
        />
        <TextAreaField
          name="costs"
          label="Costs"
          hint="e.g. “Adults R450, children R250. Family maximum R1,200.” Leave blank if free or not applicable."
          value={costs}
          onChange={setCosts}
          maxLength={500}
          rows={3}
          error={errors.costs}
        />
      </section>

      <section className="space-y-6 border-t border-navy-100 pt-8">
        <h2 className="font-serif text-xl font-bold text-navy-900">Who to contact</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            name="contactName"
            label="Contact person"
            value={contactName}
            onChange={setContactName}
            maxLength={80}
            error={errors.contactName}
          />
          <TextField
            name="contactPhone"
            label="Contact number"
            hint="People can tap it to call."
            value={contactPhone}
            onChange={setContactPhone}
            maxLength={30}
            placeholder="082 123 4567"
            error={errors.contactPhone}
          />
        </div>
      </section>

      <section className="space-y-6 border-t border-navy-100 pt-8">
        <h2 className="font-serif text-xl font-bold text-navy-900">Registration</h2>

        <CheckboxField
          name="registrationEnabled"
          label="People can register on the website"
          hint="Adds a registration form to the event's page. Registrations are private; only you can see and export them."
          checked={registrationEnabled}
          onChange={setRegistrationEnabled}
          resetKey={resetKey}
        />

        {/* Hidden (not removed) when off, so saving doesn't wipe these settings. */}
        <div className={registrationEnabled ? "space-y-6" : "hidden"}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-navy-900">
              Who can register?
            </legend>
            {REGISTRATION_TYPES.map((type) => (
              <CheckboxField
                key={type}
                name={`type_${type}`}
                label={REGISTRATION_TYPE_INFO[type].label}
                hint={REGISTRATION_TYPE_INFO[type].hint}
                checked={allowedTypes.includes(type)}
                onChange={(checked) =>
                  setAllowedTypes((current) =>
                    checked
                      ? [...new Set([...current, type])]
                      : current.filter((item) => item !== type),
                  )
                }
                resetKey={resetKey}
              />
            ))}
            {errors.registrationTypes && (
              <p className="text-xs font-medium text-red-700">{errors.registrationTypes}</p>
            )}
          </fieldset>

          <TextField
            name="registrationDeadline"
            label="Last day to register (optional)"
            hint="Leave blank to close registration when the event starts."
            type="date"
            value={registrationDeadline}
            onChange={setRegistrationDeadline}
            error={errors.registrationDeadline}
          />
        </div>

        <p className="rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-800">
          {registrationSummary({
            enabled: registrationEnabled,
            types: allowedTypes,
            startDate,
            endDate,
            deadline: registrationDeadline,
          })}
        </p>
      </section>

      <section className="space-y-6 border-t border-navy-100 pt-8">
        <h2 className="font-serif text-xl font-bold text-navy-900">
          Showing it on the website
        </h2>

        <CheckboxField
          name="published"
          label="Published"
          hint="Untick to keep it as a draft that nobody else can see."
          checked={published}
          onChange={setPublished}
          resetKey={resetKey}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            name="showFrom"
            label="Start promoting on (optional)"
            hint="Leave blank to show it straight away."
            type="date"
            value={showFrom}
            onChange={setShowFrom}
            error={errors.showFrom}
          />
          <TextField
            name="showUntil"
            label="Stop promoting after (optional)"
            hint="Leave blank to remove it after the event ends."
            type="date"
            value={showUntil}
            onChange={setShowUntil}
            error={errors.showUntil}
          />
        </div>

        <p className="rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-800">
          {promotionSummary({ published, startDate, endDate, showFrom, showUntil })}
        </p>
      </section>

      <SubmitButton busy={pending || imageBusy}>
        {pending
          ? "Saving…"
          : imageBusy
            ? "Preparing image…"
            : isCreate
              ? "Create event"
              : "Save changes"}
      </SubmitButton>
    </form>
  );
}
