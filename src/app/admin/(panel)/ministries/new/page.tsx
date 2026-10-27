import { CardForm } from "@/components/admin/CardForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getAdminMinistries, getAdminSections } from "@/lib/admin/data";

export const metadata = { title: "Add a ministry card" };

export default async function AdminMinistryNewPage() {
  const [sections, ministries] = await Promise.all([
    getAdminSections(),
    getAdminMinistries(),
  ]);

  const nextOrder =
    ministries.reduce((highest, card) => Math.max(highest, card.order), 0) + 1;

  return (
    <>
      <PageHeader
        title="Add a card"
        description="Create a new card inside one of the website's sections."
        back={{ href: "/admin/ministries", label: "All ministry cards" }}
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <CardForm
          kind="ministry"
          mode="create"
          sections={sections}
          initial={{ slug: "", title: "", order: Math.min(nextOrder, 999) }}
        />
      </div>
    </>
  );
}
