import { notFound } from "next/navigation";
import { DeleteResourceButton } from "@/components/admin/DeleteResourceButton";
import { PageHeader } from "@/components/admin/PageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";
import {
  getAdminMinistry,
  getAdminResource,
  RESOURCES_SECTION,
} from "@/lib/admin/data";

export const metadata = { title: "Edit resource" };

export default async function AdminResourceEditPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category: slug, id } = await params;
  const [category, item] = await Promise.all([
    getAdminMinistry(slug),
    getAdminResource(slug, id),
  ]);
  if (!category || category.sectionSlug !== RESOURCES_SECTION || !item) notFound();

  return (
    <>
      <PageHeader
        title={item.title}
        back={{ href: `/admin/resources/${slug}`, label: category.title }}
      />
      <div className="max-w-2xl space-y-8">
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <ResourceForm
            category={{ slug, title: category.title }}
            mode="edit"
            initial={item}
          />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy-900">Delete this resource</h2>
          <p className="mb-4 mt-1 text-sm text-navy-700/80">
            Removes it from the website for good
            {item.kind === "file" ? ", along with the uploaded file" : ""}.
          </p>
          <DeleteResourceButton
            category={slug}
            id={item.id}
            title={item.title}
            hasFile={item.kind === "file"}
          />
        </div>
      </div>
    </>
  );
}
