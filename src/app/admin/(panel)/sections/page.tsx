import { CardRow } from "@/components/admin/CardRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistries, getAdminSections } from "@/lib/admin/data";

export const metadata = { title: "Section cards" };

export default async function AdminSectionsPage() {
  const [sections, ministries] = await Promise.all([
    getAdminSections(),
    getAdminMinistries(),
  ]);

  return (
    <>
      <PageHeader
        title="Section cards"
        description="The big cards on the homepage. Each one opens a page of ministry cards."
      />
      <ul className="max-w-2xl space-y-3">
        {sections.map((section) => {
          const count = ministries.filter(
            (ministry) => ministry.sectionSlug === section.slug,
          ).length;
          return (
            <CardRow
              key={section.slug}
              card={section}
              href={`/admin/sections/${section.slug}`}
              subtitle={`/${section.slug} · ${count} ${count === 1 ? "card" : "cards"}`}
            />
          );
        })}
      </ul>
    </>
  );
}
