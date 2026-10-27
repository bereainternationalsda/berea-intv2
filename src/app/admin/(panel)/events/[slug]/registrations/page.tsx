import { notFound } from "next/navigation";
import { DeleteRegistrationButton } from "@/components/admin/DeleteRegistrationButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { deleteAllRegistrations, setRegistrationPaid } from "@/app/admin/(panel)/actions";
import { getAdminEvent, getAdminRegistrations } from "@/lib/admin/data";
import { formatEventDates } from "@/lib/events/dates";
import {
  REGISTRATION_TYPE_INFO,
  summarise,
  type StoredRegistration,
} from "@/lib/events/registration";
import { formatRegistered } from "@/lib/events/workbooks";

export const metadata = { title: "Registrations" };

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy-600">{label}</p>
    </div>
  );
}

function RegistrationCard({ slug, registration }: { slug: string; registration: StoredRegistration }) {
  const info = REGISTRATION_TYPE_INFO[registration.type];
  const children = registration.attendees.filter((person) => person.category === "child").length;
  const phoneHref = `tel:${registration.contactPhone.replace(/[^\d+]/g, "")}`;

  return (
    <li>
      <details className="group rounded-xl border border-navy-100 bg-white shadow-sm open:shadow-md">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span className="font-mono text-sm font-bold text-navy-900">{registration.id}</span>
          <span className="min-w-0 flex-1 truncate font-semibold text-navy-900">
            {registration.groupName ? `${registration.groupName} · ` : ""}
            {registration.contactName}
          </span>
          <span className="text-sm text-navy-700">
            {info.label}, {registration.attendees.length}{" "}
            {registration.attendees.length === 1 ? "person" : "people"}
            {children > 0 ? ` (${children} ${children === 1 ? "child" : "children"})` : ""}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              registration.paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {registration.paid ? "Paid" : "Not paid"}
          </span>
        </summary>

        <div className="space-y-5 border-t border-navy-100 px-4 py-4 text-sm">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-navy-600">Contact</dt>
              <dd className="mt-1 text-navy-900">
                {registration.contactName}
                <a href={phoneHref} className="block font-semibold text-navy-600 hover:text-navy-800">
                  {registration.contactPhone}
                </a>
                <a
                  href={`mailto:${registration.contactEmail}`}
                  className="block break-all text-navy-600 hover:text-navy-800"
                >
                  {registration.contactEmail}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-navy-600">
                Emergency contact
              </dt>
              <dd className="mt-1 text-navy-900">
                {registration.emergencyName ? (
                  <>
                    {registration.emergencyName}
                    <span className="block font-semibold">{registration.emergencyPhone}</span>
                  </>
                ) : (
                  <span className="text-navy-700/70">Not given</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-navy-600">Registered</dt>
              <dd className="mt-1 text-navy-900">{formatRegistered(registration.createdAt)}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-600">
                  <th className="py-2 pr-4 font-bold">Name</th>
                  <th className="py-2 pr-4 font-bold">Adult / child</th>
                  <th className="py-2 pr-4 font-bold">Age</th>
                  <th className="py-2 font-bold">Dietary needs</th>
                </tr>
              </thead>
              <tbody>
                {registration.attendees.map((person, index) => (
                  <tr key={index} className="border-b border-navy-50 align-top">
                    <td className="py-2 pr-4 font-medium text-navy-900">{person.name}</td>
                    <td className="py-2 pr-4">{person.category === "child" ? "Child" : "Adult"}</td>
                    <td className="py-2 pr-4">{person.age ?? person.ageRange ?? "—"}</td>
                    <td className="py-2">{person.dietary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={setRegistrationPaid}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={registration.id} />
              <input type="hidden" name="paid" value={registration.paid ? "false" : "true"} />
              <button
                type="submit"
                className="rounded-lg bg-navy-800 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
              >
                {registration.paid ? "Mark as not paid" : "Mark as paid"}
              </button>
            </form>
            <DeleteRegistrationButton
              slug={slug}
              id={registration.id}
              label={registration.contactName}
            />
          </div>
        </div>
      </details>
    </li>
  );
}

export default async function AdminRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();

  const registrations = await getAdminRegistrations(slug);
  const summary = summarise(registrations);

  return (
    <>
      <PageHeader
        title="Registrations"
        description={`${event.title} · ${formatEventDates(event.startDate, event.endDate)}`}
        back={{ href: `/admin/events/${slug}`, label: "Back to the event" }}
        actions={
          registrations.length > 0 ? (
            <a
              href={`/admin/events/${slug}/export`}
              className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Download Excel
            </a>
          ) : undefined
        }
      />

      {registrations.length === 0 ? (
        <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
          <p className="text-navy-800">No one has registered yet.</p>
          <p className="mt-1 text-sm text-navy-700/70">
            {event.registrationEnabled
              ? "Registrations will appear here as they come in."
              : "Registration is switched off for this event. Turn it on in the event's settings."}
          </p>
        </div>
      ) : (
        <div className="max-w-4xl space-y-10">
          <section>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Registrations" value={summary.registrations} />
              <Stat label="People" value={summary.people} />
              <Stat label="Adults" value={summary.adults} />
              <Stat label="Children" value={summary.children} />
              <Stat label="Paid" value={`${summary.paid} of ${summary.registrations}`} />
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-navy-900">Children by age</h2>
                {summary.childrenByAge.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-700/70">No children registered.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-navy-800">
                    {summary.childrenByAge.map(({ age, count }) => (
                      <li key={age} className="flex justify-between">
                        <span>Age {age}</span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-navy-900">Adults by age range</h2>
                {summary.adultsByRange.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-700/70">No adults registered.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-navy-800">
                    {summary.adultsByRange.map(({ range, count }) => (
                      <li key={range} className="flex justify-between">
                        <span>{range}</span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-navy-100 pt-3 text-sm text-navy-800">
                  <span className="font-semibold">{summary.withDietaryNeeds}</span>{" "}
                  {summary.withDietaryNeeds === 1 ? "person has" : "people have"} dietary needs or
                  allergies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-navy-900">
              All registrations{" "}
              <span className="text-sm font-normal text-navy-700/70">(newest first)</span>
            </h2>
            <ul className="space-y-3">
              {[...registrations].reverse().map((registration) => (
                <RegistrationCard key={registration.id} slug={slug} registration={registration} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-navy-900">Delete all registrations</h2>
            <p className="mt-1 text-sm text-navy-700/80">
              For when the event is over and the details are no longer needed. This removes
              every registration for this event for good, so download the Excel file first if
              you still need it.
            </p>
            <form action={deleteAllRegistrations} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="slug" value={slug} />
              <label className="text-sm font-semibold text-navy-900">
                Type DELETE to confirm
                <input
                  name="confirmation"
                  required
                  pattern="DELETE"
                  autoComplete="off"
                  className="mt-1 block w-40 rounded-lg border border-navy-100 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
              >
                Delete all {summary.registrations}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
