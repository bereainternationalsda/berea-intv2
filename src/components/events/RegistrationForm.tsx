"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { registerForEvent } from "@/app/(site)/events/[slug]/actions";
import { PrivacyNotice } from "@/components/events/PrivacyNotice";
import { attendeesFromRows } from "@/lib/events/attendee-import";
import {
  ADULT_AGE_RANGES,
  PEOPLE_LIMITS,
  REGISTRATION_TYPE_INFO,
  validateRegistration,
  type AttendeeDraft,
  type RegistrationState,
  type RegistrationType,
} from "@/lib/events/registration";
import { buildTemplateSheets } from "@/lib/events/workbooks";

// ---- small building blocks -------------------------------------------------

const inputClass =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20";
const borderFor = (error?: string) =>
  error ? "border-red-400 focus:border-red-500" : "border-navy-100 focus:border-navy-600";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-navy-700/70">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: "text" | "tel" | "email" | "number";
  autoComplete?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        inputMode={type === "number" ? "numeric" : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} ${borderFor(error)}`}
      />
    </Field>
  );
}

// ---- state shapes ----------------------------------------------------------

type Row = AttendeeDraft & { id: number };

const blankRow = (id: number): Row => ({
  id,
  name: "",
  category: "",
  age: "",
  ageRange: "",
  dietary: "",
});

const isBlank = (row: Row) =>
  !row.name && !row.category && !row.age && !row.ageRange && !row.dietary;

type ImportNotes = { added: number; problems: string[]; truncated: boolean };

type Props = {
  eventSlug: string;
  eventTitle: string;
  allowedTypes: RegistrationType[];
  contactName?: string;
  contactPhone?: string;
  /** Called from the confirmation screen to start a fresh registration. */
  onRegisterAnother: () => void;
};

// ---- the form --------------------------------------------------------------

export function RegistrationForm({
  eventSlug,
  eventTitle,
  allowedTypes,
  contactName: organiserName,
  contactPhone: organiserPhone,
  onRegisterAnother,
}: Props) {
  const idCounter = useRef(1);
  const nextId = () => (idCounter.current += 1);
  const bannerRef = useRef<HTMLDivElement>(null);

  const [state, submitAction, pending] = useActionState<RegistrationState, FormData>(
    registerForEvent,
    { status: "idle" },
  );

  const [type, setType] = useState<RegistrationType | "">(
    allowedTypes.length === 1 ? allowedTypes[0] : "",
  );
  const [groupName, setGroupName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow(1)]);
  const [firstNameFollowsContact, setFirstNameFollowsContact] = useState(true);
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState(""); // honeypot: real people never touch this
  // Once someone has tried to submit, errors update live as they fix each field.
  const [showErrors, setShowErrors] = useState(false);
  const [errorStamp, setErrorStamp] = useState(0);
  const [importNotes, setImportNotes] = useState<ImportNotes | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const payload = {
    type,
    groupName,
    contactName,
    contactPhone,
    contactEmail,
    emergencyName,
    emergencyPhone,
    attendees: rows.map((row) => ({
      name: row.name,
      category: row.category,
      age: row.age,
      ageRange: row.ageRange,
      dietary: row.dietary,
    })),
    consent,
  };

  // The same rules the server uses, so what's flagged here is what the server would refuse.
  const check = showErrors ? validateRegistration(payload, { allowedTypes }) : null;
  const liveErrors = check && !check.ok ? check.errors : {};
  const serverFieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errors = showErrors
    ? Object.keys(liveErrors).length > 0
      ? liveErrors
      : serverFieldErrors
    : {};
  // Messages that aren't about a field (registration closed, too many attempts...)
  const generalError =
    showErrors && state.status === "error" && !state.fieldErrors ? state.message : null;
  const hasErrors = Object.keys(errors).length > 0 || generalError !== null;

  // Move focus to the error summary so keyboard and screen-reader users notice it.
  const serverStamp = state.status === "error" ? state.at : 0;
  useEffect(() => {
    if (errorStamp + serverStamp > 0) bannerRef.current?.focus();
  }, [errorStamp, serverStamp]);

  const limits = type ? PEOPLE_LIMITS[type] : { min: 1, max: 1 };

  // ---- people list ----------------------------------------------------------

  function chooseType(next: RegistrationType) {
    setType(next);
    setRows((current) => {
      const limit = PEOPLE_LIMITS[next];
      const trimmed = current.slice(0, limit.max);
      while (trimmed.length < limit.min) trimmed.push(blankRow(nextId()));
      return trimmed;
    });
  }

  function updateRow(id: number, patch: Partial<AttendeeDraft>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        // Switching adult/child makes the other age field meaningless.
        if (patch.category === "adult") next.age = "";
        if (patch.category === "child") next.ageRange = "";
        return next;
      }),
    );
  }

  function handleContactName(value: string) {
    setContactName(value);
    // The first person is usually the one registering, so keep their name in step
    // until they edit it themselves.
    if (firstNameFollowsContact) {
      setRows((current) =>
        current.map((row, index) => (index === 0 ? { ...row, name: value } : row)),
      );
    }
  }

  function addRow() {
    setRows((current) =>
      current.length >= limits.max ? current : [...current, blankRow(nextId())],
    );
  }

  function removeRow(id: number) {
    setRows((current) =>
      current.length <= limits.min ? current : current.filter((row) => row.id !== id),
    );
  }

  // ---- Excel template and import --------------------------------------------

  async function downloadTemplate() {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    await writeExcelFile(buildTemplateSheets()).toFile("berea-event-attendees-template.xlsx");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportNotes(null);
    try {
      if (!/\.xlsx$/i.test(file.name)) {
        setImportError("Please choose an Excel file ending in .xlsx (the template you downloaded).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setImportError("That file is too large. The template should be well under 2 MB.");
        return;
      }

      const { readSheet } = await import("read-excel-file/universal");
      const result = attendeesFromRows((await readSheet(await file.arrayBuffer())) as unknown[][]);

      if (result.attendees.length === 0) {
        setImportError(result.problems[0] ?? "We couldn't find anyone in that file.");
        return;
      }

      setRows((current) => {
        // Drop empty rows, and the first row if it only holds the copied contact name.
        const keep = current.filter(
          (row, index) =>
            !(isBlank(row) || (index === 0 && firstNameFollowsContact && !row.category && !row.age && !row.ageRange && !row.dietary)),
        );
        const incoming = result.attendees.map((person) => ({ ...person, id: nextId() }));
        return [...keep, ...incoming].slice(0, PEOPLE_LIMITS.group.max);
      });
      setFirstNameFollowsContact(false);
      setImportNotes({
        added: result.attendees.length,
        problems: result.problems,
        truncated: result.truncated,
      });
    } catch {
      setImportError("We couldn't read that file. Please use the template, saved as an Excel (.xlsx) file.");
    } finally {
      input.value = ""; // lets the same file be chosen again
      setImporting(false);
    }
  }

  // ---- submit ---------------------------------------------------------------

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Not <form action>: React would reset every dropdown and tick-box after the
    // server replies. Calling the action ourselves keeps what the person entered.
    event.preventDefault();

    setShowErrors(true);
    const result = validateRegistration(payload, { allowedTypes });
    if (!result.ok) {
      setErrorStamp((value) => value + 1);
      return;
    }

    const data = new FormData();
    data.set("eventSlug", eventSlug);
    data.set("payload", JSON.stringify(payload));
    data.set("website", trap);
    startTransition(() => submitAction(data));
  }

  // ---- confirmation ---------------------------------------------------------

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-green-800">
          You&rsquo;re registered
        </p>
        <p className="mt-4 text-sm text-green-900">Your reference number is</p>
        <p
          className="mt-2 select-all font-mono text-3xl font-bold tracking-widest text-green-950"
          data-testid="reference"
        >
          {state.reference}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-green-900">
          {state.people === 1 ? "1 person is" : `${state.people} people are`} registered for{" "}
          <strong>{eventTitle}</strong>. We don&rsquo;t send an email, so please{" "}
          <strong>write this number down or take a screenshot</strong>. You&rsquo;ll need it
          if you contact the organiser.
        </p>
        {(organiserName || organiserPhone) && (
          <p className="mt-3 text-sm text-green-900">
            Questions? Contact {[organiserName, organiserPhone].filter(Boolean).join(" on ")}.
          </p>
        )}
        <button
          type="button"
          onClick={onRegisterAnother}
          className="mt-6 rounded-lg border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-900 transition-colors hover:bg-green-100"
        >
          Register someone else
        </button>
      </div>
    );
  }

  // ---- the form -------------------------------------------------------------

  const anyChild = rows.some((row) => row.category === "child");
  const individual = type === "individual";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {hasErrors && (
        <div
          ref={bannerRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 focus:outline-none"
        >
          {generalError ?? "Please check the highlighted fields below."}
        </div>
      )}

      {/* Honeypot: hidden from people and from assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={(event) => setTrap(event.target.value)}
          />
        </label>
      </div>

      {/* 1. type */}
      {allowedTypes.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">How are you registering?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {allowedTypes.map((option) => {
              const selected = type === option;
              return (
                <label
                  key={option}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    selected
                      ? "border-navy-800 bg-navy-50 ring-2 ring-navy-800/20"
                      : "border-navy-100 bg-white hover:bg-navy-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="registration-type"
                    value={option}
                    checked={selected}
                    onChange={() => chooseType(option)}
                    className="sr-only"
                  />
                  <span className="block font-semibold text-navy-900">
                    {REGISTRATION_TYPE_INFO[option].label}
                  </span>
                  <span className="mt-1 block text-xs text-navy-700/80">
                    {REGISTRATION_TYPE_INFO[option].hint}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.type && <p className="mt-2 text-xs font-medium text-red-700">{errors.type}</p>}
        </fieldset>
      )}

      {/* 2. contact person */}
      <section className="space-y-5">
        <h3 className="font-serif text-lg font-bold text-navy-900">Your details</h3>
        {type === "group" && (
          <TextInput
            id="reg-group"
            label="Name of your group"
            hint="e.g. the name of your club, church or school group"
            value={groupName}
            onChange={setGroupName}
            error={errors.groupName}
            maxLength={80}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="reg-contact-name"
            label={type === "group" ? "Contact person" : "Your full name"}
            value={contactName}
            onChange={handleContactName}
            error={errors.contactName}
            autoComplete="name"
            maxLength={80}
          />
          <TextInput
            id="reg-contact-phone"
            label="Phone number"
            type="tel"
            value={contactPhone}
            onChange={setContactPhone}
            error={errors.contactPhone}
            autoComplete="tel"
            placeholder="082 123 4567"
            maxLength={30}
          />
        </div>
        <TextInput
          id="reg-contact-email"
          label="Email address"
          type="email"
          value={contactEmail}
          onChange={setContactEmail}
          error={errors.contactEmail}
          autoComplete="email"
          maxLength={120}
        />
      </section>

      {/* 3. emergency contact */}
      <section className="space-y-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-navy-900">Emergency contact</h3>
          <p className="mt-1 text-sm text-navy-700/80">
            {anyChild
              ? "Required, because a child is coming. Someone other than you, if possible."
              : "Optional. Someone we can call if we can't reach you."}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="reg-emergency-name"
            label="Their name"
            value={emergencyName}
            onChange={setEmergencyName}
            error={errors.emergencyName}
            maxLength={80}
          />
          <TextInput
            id="reg-emergency-phone"
            label="Their phone number"
            type="tel"
            value={emergencyPhone}
            onChange={setEmergencyPhone}
            error={errors.emergencyPhone}
            maxLength={30}
          />
        </div>
      </section>

      {/* 4. who's coming */}
      <section className="space-y-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-navy-900">
            {individual ? "Who is coming?" : "Everyone who is coming"}
          </h3>
          <p className="mt-1 text-sm text-navy-700/80">
            {!type
              ? "Choose how you are registering above."
              : individual
                ? "Tell us a little about the person attending."
                : "List every person, including yourself if you are attending. Adults give an age range; children give their age."}
          </p>
          {errors.attendees && (
            <p className="mt-2 text-xs font-medium text-red-700">{errors.attendees}</p>
          )}
        </div>

        {type === "group" && (
          <div className="rounded-xl border border-navy-100 bg-navy-50 p-4">
            <p className="text-sm font-semibold text-navy-900">Registering a large group?</p>
            <p className="mt-1 text-sm text-navy-700/80">
              Download the Excel template, fill in one row per person, then upload it. You
              can still change anyone afterwards.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-100"
              >
                Download the template
              </button>
              <label className="cursor-pointer rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700">
                {importing ? "Reading…" : "Upload the filled-in template"}
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleImport}
                  disabled={importing}
                  className="sr-only"
                  data-testid="import-file"
                />
              </label>
            </div>
            {importError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {importError}
              </p>
            )}
            {importNotes && (
              <div className="mt-3 text-sm text-navy-800" role="status">
                <p className="font-semibold">
                  Added {importNotes.added} {importNotes.added === 1 ? "person" : "people"} from
                  your spreadsheet. Please check each row below.
                </p>
                {importNotes.truncated && (
                  <p className="mt-1 text-amber-800">
                    Only the first {PEOPLE_LIMITS.group.max} people were added.
                  </p>
                )}
                {importNotes.problems.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                    {importNotes.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {type && (
          <ul className="space-y-4">
            {rows.map((row, index) => {
              const key = `attendees.${index}`;
              const base = `reg-person-${row.id}`;
              return (
                <li key={row.id} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-navy-900">
                      {individual ? "Attendee" : `Person ${index + 1}`}
                    </p>
                    {!individual && rows.length > limits.min && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-sm font-semibold text-red-700 hover:text-red-900"
                        aria-label={`Remove person ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput
                      id={`${base}-name`}
                      label="Full name"
                      value={row.name}
                      onChange={(value) => {
                        if (index === 0) setFirstNameFollowsContact(false);
                        updateRow(row.id, { name: value });
                      }}
                      error={errors[`${key}.name`]}
                      maxLength={80}
                    />

                    <Field id={`${base}-category`} label="Adult or child?" error={errors[`${key}.category`]}>
                      <select
                        id={`${base}-category`}
                        value={row.category}
                        onChange={(event) =>
                          updateRow(row.id, { category: event.target.value as AttendeeDraft["category"] })
                        }
                        aria-invalid={Boolean(errors[`${key}.category`])}
                        className={`${inputClass} ${borderFor(errors[`${key}.category`])}`}
                      >
                        <option value="">Choose…</option>
                        <option value="adult">Adult (18 or older)</option>
                        <option value="child">Child (under 18)</option>
                      </select>
                    </Field>

                    {row.category === "child" && (
                      <TextInput
                        id={`${base}-age`}
                        label="Child's age"
                        type="number"
                        value={row.age}
                        onChange={(value) => updateRow(row.id, { age: value })}
                        error={errors[`${key}.age`]}
                        hint="In years, 0 to 17"
                      />
                    )}
                    {row.category === "adult" && (
                      <Field id={`${base}-range`} label="Age range (optional)" error={errors[`${key}.ageRange`]}>
                        <select
                          id={`${base}-range`}
                          value={row.ageRange}
                          onChange={(event) => updateRow(row.id, { ageRange: event.target.value })}
                          aria-invalid={Boolean(errors[`${key}.ageRange`])}
                          className={`${inputClass} ${borderFor(errors[`${key}.ageRange`])}`}
                        >
                          <option value="">Prefer not to say</option>
                          {ADULT_AGE_RANGES.map((range) => (
                            <option key={range} value={range}>
                              {range}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    <div className="sm:col-span-2">
                      <TextInput
                        id={`${base}-dietary`}
                        label="Dietary needs or allergies (optional)"
                        value={row.dietary}
                        onChange={(value) => updateRow(row.id, { dietary: value })}
                        error={errors[`${key}.dietary`]}
                        placeholder="e.g. Vegetarian, peanut allergy"
                        maxLength={200}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {type && !individual && rows.length < limits.max && (
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
          >
            + Add another person
          </button>
        )}
      </section>

      {/* 5. consent */}
      <section className="space-y-4">
        <PrivacyNotice
          eventTitle={eventTitle}
          contactName={organiserName}
          contactPhone={organiserPhone}
        />
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              aria-invalid={Boolean(errors.consent)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-100"
            />
            <span>
              I have read the privacy notice and I agree to the church using these details to
              organise this event. If anyone I have registered is under 18, I am their parent
              or legal guardian, or I have their guardian&rsquo;s permission.
            </span>
          </label>
          {errors.consent && (
            <p className="mt-1 text-xs font-medium text-red-700">{errors.consent}</p>
          )}
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Submitting…" : "Submit registration"}
      </button>
    </form>
  );
}
