import { CardGrid } from "@/components/CardGrid";
import { getMinistriesForSection } from "@/lib/content";

export const metadata = { title: "Services | Berea SDA Church" };

export default async function ServicesPage() {
  const items = await getMinistriesForSection("services");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          Services
        </h1>
        <p className="mt-3 text-navy-700/80">
          Join us for worship, in person or online. Details are managed from
          the Studio and will appear here.
        </p>
      </div>

      <div className="mt-12">
        <CardGrid items={items} basePath="/services" />
      </div>
    </section>
  );
}
