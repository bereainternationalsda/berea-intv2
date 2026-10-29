import Link from "next/link";
import { notFound } from "next/navigation";
import { CardForm } from "@/components/admin/CardForm";
import { DeleteMinistryButton } from "@/components/admin/DeleteMinistryButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistry, getAdminSections } from "@/lib/admin/data";

export const metadata = { title: "Edit ministry card" };

export default async function AdminMinistryEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ministry, sections] = await Promise.all([
    getAdminMinistry(slug),
    getAdminSections(),
  ]);
  if (!ministry) notFound();

  return (
    <>
      <PageHeader
        title={ministry.title}
        back={{ href: "/admin/ministries", label: "All ministry cards" }}
      />
      <div className="max-w-2xl space-y-8">
        {ministry.sectionSlug === "resources" && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="font-semibold text-navy-900">Files and links</h2>
              <p className="mt-1 text-sm text-navy-700/80">
                The downloads people see when they open this card.
              </p>
            </div>
            <Link
              href={`/admin/resources/${ministry.slug}`}
              className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Manage resources
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <CardForm
            kind="ministry"
            mode="edit"
            initial={ministry}
            sections={sections}
          />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy-900">Delete this card</h2>
          <p className="mb-4 mt-1 text-sm text-navy-700/80">
            Removes the card and its photo from the website for good.
            {ministry.sectionSlug === "resources"
              ? " Every file and link in this category is deleted with it."
              : ""}
          </p>
          <DeleteMinistryButton slug={ministry.slug} title={ministry.title} />
        </div>
      </div>
    </>
  );
}
