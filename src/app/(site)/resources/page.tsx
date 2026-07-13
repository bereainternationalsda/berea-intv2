import { CardGrid } from "@/components/CardGrid";
import { getMinistriesForSection } from "@/lib/content";

export const metadata = { title: "Resources | Berea SDA Church" };

export default async function ResourcesPage() {
  const items = await getMinistriesForSection("resources");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Resources
        </h1>
        <p className="mt-3 text-navy-700/80">
          Bible study guides, sermons, and materials to help you grow. Added
          and managed from the Studio.
        </p>
      </div>

      <div className="mt-12">
        <CardGrid items={items} basePath="/resources" />
      </div>
    </section>
  );
}
