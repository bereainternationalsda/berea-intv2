import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { getAdminMinistry, RESOURCES_SECTION } from "@/lib/admin/data";

export const metadata = { title: "Add a resource" };

export default async function AdminResourceNewPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = await getAdminMinistry(slug);
  if (!category || category.sectionSlug !== RESOURCES_SECTION) notFound();

  return (
    <>
      <PageHeader
        title="Add a resource"
        description={`It will appear in ${category.title}.`}
        back={{ href: `/admin/resources/${slug}`, label: category.title }}
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <ResourceForm category={{ slug, title: category.title }} mode="create" />
      </div>
    </>
  );
}
