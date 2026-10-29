import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistry, getAdminResources, RESOURCES_SECTION } from "@/lib/admin/data";
import { resourceBadge, resourceMeta } from "@/lib/resources/files";

export const metadata = { title: "Resources" };

export default async function AdminResourceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = await getAdminMinistry(slug);
  if (!category || category.sectionSlug !== RESOURCES_SECTION) notFound();

  const items = await getAdminResources(slug);

  return (
    <>
      <PageHeader
        title={category.title}
        description="Everything in this category, in the order visitors see it."
        back={{ href: "/admin/resources", label: "All resource categories" }}
        actions={
          <Link
            href={`/admin/resources/${slug}/new`}
            className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            + Add a resource
          </Link>
        }
      />

      <div className="max-w-2xl space-y-6">
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Link
            href={`/admin/ministries/${slug}`}
            className="font-semibold text-navy-600 hover:text-navy-800"
          >
            Edit the card&rsquo;s title, description and image
          </Link>
          <Link
            href={`/resources/${slug}`}
            target="_blank"
            className="font-semibold text-navy-600 hover:text-navy-800"
          >
            View on the website ↗
          </Link>
        </p>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
            <p className="text-navy-800">Nothing in this category yet.</p>
            <p className="mt-1 text-sm text-navy-700/70">
              Add PDFs, PowerPoints, Word documents or links for people to open.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/resources/${slug}/${item.id}`}
                  className="flex items-center gap-4 rounded-xl border border-navy-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-xs font-bold tracking-wide text-navy-700">
                    {resourceBadge(item)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy-900">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-navy-700/70">
                      {resourceMeta(item)}
                      {typeof item.order === "number" ? ` · pinned at position ${item.order}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-navy-600">Edit &rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
