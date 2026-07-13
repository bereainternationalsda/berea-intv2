import { Hero } from "@/components/Hero";
import { CardGrid } from "@/components/CardGrid";
import { getSections, getSiteSettings } from "@/lib/content";
import { urlFor } from "@/sanity/image";

export default async function HomePage() {
  const [sections, siteSettings] = await Promise.all([
    getSections(),
    getSiteSettings(),
  ]);

  const heroImageUrl = siteSettings.heroImage?.asset
    ? urlFor(siteSettings.heroImage).width(1920).height(1080).fit("crop").url()
    : undefined;

  return (
    <>
      <Hero
        eyebrow={siteSettings.heroEyebrow}
        headline={siteSettings.heroHeadline}
        subtitle={siteSettings.heroSubtitle}
        imageUrl={heroImageUrl}
      />

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
