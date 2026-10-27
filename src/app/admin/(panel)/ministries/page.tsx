import Link from "next/link";
import { CardRow } from "@/components/admin/CardRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistries, getAdminSections } from "@/lib/admin/data";

export const metadata = { title: "Ministry cards" };

export default async function AdminMinistriesPage() {
  const [sections, ministries] = await Promise.all([
    getAdminSections(),
    getAdminMinistries(),
  ]);

  // Cards pointing at a section that no longer exists would otherwise vanish.
  const knownSlugs = new Set(sections.map((section) => section.slug));
  const orphaned = ministries.filter(
    (ministry) => !ministry.sectionSlug || !knownSlugs.has(ministry.sectionSlug),
  );

  return (
    <>
      <PageHeader
        title="Ministry cards"
        description="The cards inside each section, like Pathfinders under Departments."
        actions={
          <Link
            href="/admin/ministries/new"
            className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            + Add a card
          </Link>
        }
      />

      <div className="max-w-2xl space-y-10">
        {sections.map((section) => {
          const cards = ministries.filter(
            (ministry) => ministry.sectionSlug === section.slug,
          );
          return (
            <section key={section.slug}>
              <h2 className="mb-3 font-serif text-xl font-bold text-navy-900">
                {section.title}
              </h2>
              {cards.length === 0 ? (
                <p className="text-sm text-navy-700/70">No cards in this section yet.</p>
              ) : (
                <ul className="space-y-3">
                  {cards.map((card) => (
                    <CardRow
                      key={card.slug}
                      card={card}
                      href={`/admin/ministries/${card.slug}`}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {orphaned.length > 0 && (
          <section>
            <h2 className="mb-1 font-serif text-xl font-bold text-navy-900">
              Not in a section
            </h2>
            <p className="mb-3 text-sm text-navy-700/70">
              These aren&rsquo;t shown on the website. Open one and choose a section.
            </p>
            <ul className="space-y-3">
              {orphaned.map((card) => (
                <CardRow
                  key={card.slug}
                  card={card}
                  href={`/admin/ministries/${card.slug}`}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
