import { notFound } from "next/navigation";
import { CardForm } from "@/components/admin/CardForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminSection } from "@/lib/admin/data";

export const metadata = { title: "Edit section card" };

export default async function AdminSectionEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = await getAdminSection(slug);
  if (!section) notFound();

  return (
    <>
      <PageHeader
        title={section.title}
        description="Edit how this card looks on the homepage."
        back={{ href: "/admin/sections", label: "All section cards" }}
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <CardForm kind="section" mode="edit" initial={section} />
      </div>
    </>
  );
}
