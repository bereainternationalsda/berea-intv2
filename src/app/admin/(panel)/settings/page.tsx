import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAdminSettings } from "@/lib/admin/data";

export const metadata = { title: "Site settings" };

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return (
    <>
      <PageHeader
        title="Site settings"
        description="The big photo and heading at the top of the homepage."
      />
      <div className="max-w-2xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
