import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Add an event" };

export default async function AdminEventNewPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add an event"
        description="Fill this in, then publish when you're ready for it to appear on the website."
        back={{ href: "/admin/events", label: "All events" }}
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <EventForm
          mode="create"
          initial={{ slug: "", title: "", startDate: "", published: false }}
        />
      </div>
    </>
  );
}
