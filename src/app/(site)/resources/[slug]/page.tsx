import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceList } from "@/components/resources/ResourceList";
import { getMinistriesForSection } from "@/lib/content";
import { getResourcesForCategory } from "@/lib/resources/content";

// Re-render at most once a minute so content edits show up without a redeploy.
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function getCategory(slug: string) {
  const categories = await getMinistriesForSection("resources");
  return categories.find((item) => item.slug === slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Not found" };
  return {
    title: `${category.title} | Resources | Berea International SDA`,
    description: category.description?.slice(0, 160),
  };
}

// Detail page for a resource category, e.g. /resources/sermons.
export default async function ResourceCategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const items = await getResourcesForCategory(slug);

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/resources"
        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
      >
        &larr; Back to Resources
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {category.icon && (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-navy-50 text-4xl">
            {category.icon}
          </span>
        )}
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          {category.title}
        </h1>
      </div>

      {category.description && (
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-navy-700/90">
          {category.description}
        </p>
      )}

      <div className="mt-10">
        <ResourceList items={items} />
      </div>
    </section>
  );
}
