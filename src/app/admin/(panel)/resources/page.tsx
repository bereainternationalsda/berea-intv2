import Link from "next/link";
import { CardRow } from "@/components/admin/CardRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminResourceCategories } from "@/lib/admin/data";

export const metadata = { title: "Resources" };

export default async function AdminResourcesPage() {
  const categories = await getAdminResourceCategories();

  return (
    <>
      <PageHeader
        title="Resources"
        description="Groups of downloads and links, like Sermons or Training material. Each group is a card on the website's Resources page. Open one to add files and links to it."
        actions={
          <Link
            href="/admin/ministries/new?section=resources"
            className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            + Add a category
          </Link>
        }
      />

      <div className="max-w-2xl">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
            <p className="text-navy-800">There are no resource categories yet.</p>
            <p className="mt-1 text-sm text-navy-700/70">
              Start with a category such as &ldquo;Sermons&rdquo; or &ldquo;Training
              material&rdquo;, then add files and links to it.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((category) => (
              <CardRow
                key={category.slug}
                card={category}
                href={`/admin/resources/${category.slug}`}
                actionLabel="Open"
                subtitle={
                  category.resourceCount === 0
                    ? "Nothing added yet"
                    : `${category.resourceCount} ${category.resourceCount === 1 ? "item" : "items"}`
                }
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
