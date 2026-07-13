import { Hero } from "@/components/Hero";
import { CardGrid } from "@/components/CardGrid";
import { getSections } from "@/lib/content";

export default async function HomePage() {
  const sections = await getSections();

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-navy-900">
            Get to Know Our Church
          </h2>
          <p className="mt-3 text-navy-700/80">
            Explore who we are, how we serve, and how you can get involved.
          </p>
        </div>

        <div className="mt-12">
          <CardGrid items={sections} basePath="" />
        </div>
      </section>
    </>
  );
}
