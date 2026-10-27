import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinistriesForSection, getSections } from "@/lib/content";

// Re-render at most once a minute so content edits show up without a redeploy.
export const revalidate = 60;

// Detail page for any card nested under a section, e.g.
// /departments/pathfinders or /services/adventist-community-service.
export default async function MinistryPage({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  const [sections, ministries] = await Promise.all([
    getSections(),
    getMinistriesForSection(section),
  ]);

  const ministry = ministries.find((item) => item.slug === slug);
  if (!ministry) notFound();

  const sectionTitle =
    sections.find((item) => item.slug === section)?.title ?? section;

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href={`/${section}`}
        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
      >
        &larr; Back to {sectionTitle}
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {ministry.icon && (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-navy-50 text-4xl">
            {ministry.icon}
          </span>
        )}
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          {ministry.title}
        </h1>
      </div>

      <p className="mt-6 text-lg leading-relaxed text-navy-700/90">
        {ministry.description ?? "Content for this ministry is coming soon."}
      </p>
    </section>
  );
}
