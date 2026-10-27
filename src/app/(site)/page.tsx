import { Hero } from "@/components/Hero";
import { CardGrid } from "@/components/CardGrid";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { getSections, getSiteSettings } from "@/lib/content";

// Re-render at most once a minute so content edits show up without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const [sections, siteSettings] = await Promise.all([
    getSections(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Hero
        eyebrow={siteSettings.heroEyebrow}
        headline={siteSettings.heroHeadline}
        subtitle={siteSettings.heroSubtitle}
        imageUrl={siteSettings.heroImageUrl}
      />

      <UpcomingEvents />

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
