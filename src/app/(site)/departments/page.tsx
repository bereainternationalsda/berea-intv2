import { CardGrid } from "@/components/CardGrid";
import { getMinistriesForSection } from "@/lib/content";

export const metadata = { title: "Departments | Berea International SDA" };

// Re-render at most once a minute so content edits show up without a redeploy.
export const revalidate = 60;

export default async function DepartmentsPage() {
  const ministries = await getMinistriesForSection("departments");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Departments
        </h1>
        <p className="mt-3 text-navy-700/80">
          Every ministry plays a part in our church family. Explore where you
          can connect and serve.
        </p>
      </div>

      <div className="mt-12">
        <CardGrid items={ministries} basePath="/departments" />
      </div>
    </section>
  );
}
