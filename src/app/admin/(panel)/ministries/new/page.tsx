import { CardForm } from "@/components/admin/CardForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistries, getAdminSections } from "@/lib/admin/data";

export const metadata = { title: "Add a ministry card" };

export default async function AdminMinistryNewPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const [sections, ministries] = await Promise.all([
    getAdminSections(),
    getAdminMinistries(),
  ]);

  const nextOrder =
    ministries.reduce((highest, card) => Math.max(highest, card.order), 0) + 1;

  // e.g. the Resources screen links here with ?section=resources
  const preselected = sections.find((item) => item.slug === section)?.slug;
  const isResources = preselected === "resources";

  return (
    <>
      <PageHeader
        title={isResources ? "Add a resource category" : "Add a card"}
        description={
          isResources
            ? "A category is a card on the Resources page, such as Sermons or Training material. You'll add its files and links next."
            : "Create a new card inside one of the website's sections."
        }
        back={
          isResources
            ? { href: "/admin/resources", label: "All resource categories" }
            : { href: "/admin/ministries", label: "All ministry cards" }
        }
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <CardForm
          kind="ministry"
          mode="create"
          sections={sections}
          initial={{
            slug: "",
            title: "",
            order: Math.min(nextOrder, 999),
            sectionSlug: preselected,
          }}
        />
      </div>
    </>
  );
}
