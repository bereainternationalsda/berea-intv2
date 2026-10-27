import { CardGrid } from "@/components/CardGrid";
import { getMinistriesForSection } from "@/lib/content";

export const metadata = { title: "Services | Berea International SDA" };

// Re-render at most once a minute so content edits show up without a redeploy.
export const revalidate = 60;

export default async function ServicesPage() {
  const items = await getMinistriesForSection("services");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Services
        </h1>
        <p className="mt-3 text-navy-700/80">
          Join us for worship and see the ways our church serves its community.
        </p>
      </div>

      <div className="mt-12">
        <CardGrid items={items} basePath="/services" />
      </div>
    </section>
  );
}
