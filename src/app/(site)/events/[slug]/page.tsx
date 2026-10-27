import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicEvent } from "@/lib/events/content";
import { getSiteUrl } from "@/lib/site-url";
import {
  formatEventDates,
  formatEventTimes,
  hasEnded,
  isHappeningNow,
  todayInSA,
} from "@/lib/events/dates";

// Re-render at most once a minute, so "ended" notices appear without a redeploy.
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

/**
 * WhatsApp and Facebook show this picture when the link is shared. Messaging
 * apps often skip very large images, so when the site's address is known we
 * point at Next's resized copy (1200px wide) instead of the original upload.
 */
function shareImageUrl(imageUrl: string): string {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return imageUrl;
  return `${siteUrl}/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=75`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Event not found" };

  const description =
    event.summary ??
    (event.description ? event.description.slice(0, 160) : undefined) ??
    formatEventDates(event.startDate, event.endDate);

  return {
    title: `${event.title} | Berea International SDA`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      ...(event.imageUrl ? { images: [{ url: shareImageUrl(event.imageUrl) }] } : {}),
    },
    twitter: {
      card: event.imageUrl ? "summary_large_image" : "summary",
      title: event.title,
      description,
    },
  };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-navy-600">{label}</dt>
      <dd className="mt-1 text-navy-900">{children}</dd>
    </div>
  );
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const today = todayInSA();
  const ended = hasEnded(event, today);
  const happeningNow = isHappeningNow(event, today);
  const times = formatEventTimes(event.startTime, event.endTime);
  const paragraphs = (event.description ?? "").split(/\n{2,}/).filter(Boolean);
  const phoneHref = event.contactPhone
    ? `tel:${event.contactPhone.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <article className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/events"
        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
      >
        &larr; All events
      </Link>

      {ended && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          This event has ended.
        </p>
      )}

      <header className="mt-6">
        {happeningNow && (
          <p className="mb-2 inline-block rounded-full bg-navy-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Happening now
          </p>
        )}
        <h1 className="font-serif text-3xl font-bold text-navy-900 sm:text-4xl">
          {event.title}
        </h1>
        <p className="mt-3 text-lg text-navy-700">
          {formatEventDates(event.startDate, event.endDate)}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {event.imageUrl && (
            // Not cropped: a full poster should be readable in one piece.
            <Image
              src={event.imageUrl}
              alt={`Poster for ${event.title}`}
              width={1200}
              height={800}
              sizes="(min-width: 1024px) 700px, 100vw"
              priority
              className="h-auto w-full rounded-2xl border border-navy-100"
            />
          )}

          {paragraphs.length > 0 && (
            <div className="space-y-4 text-lg leading-relaxed text-navy-800">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-navy-100 bg-navy-50 p-6">
          <h2 className="font-serif text-lg font-bold text-navy-900">The details</h2>
          <dl className="mt-5 space-y-5">
            <Detail label="When">
              {formatEventDates(event.startDate, event.endDate)}
              {times && <span className="block text-navy-700">{times}</span>}
            </Detail>

            {event.venue && (
              <Detail label="Where">
                {event.venue}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm font-semibold text-navy-600 hover:text-navy-800"
                >
                  Get directions ↗
                </a>
              </Detail>
            )}

            {event.costs && (
              <Detail label="Cost">
                <span className="whitespace-pre-line">{event.costs}</span>
              </Detail>
            )}

            {(event.contactName || event.contactPhone) && (
              <Detail label="Questions? Contact">
                {event.contactName && <span className="block">{event.contactName}</span>}
                {phoneHref && event.contactPhone && (
                  <a
                    href={phoneHref}
                    className="block font-semibold text-navy-600 hover:text-navy-800"
                  >
                    {event.contactPhone}
                  </a>
                )}
              </Detail>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
