import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinistriesForSection } from "@/lib/content";

export default async function MinistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ministries = await getMinistriesForSection("departments");
  const ministry = ministries.find((item) => item.slug === slug);

  if (!ministry) notFound();

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/departments"
        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
      >
        &larr; Back to Departments
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {ministry.icon && (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-navy-50 text-4xl">
            {ministry.icon}
          </span>
        )}
        <h1 className="font-serif text-3xl font-bold text-navy-900">
          {ministry.title}
        </h1>
      </div>

      <p className="mt-6 text-lg leading-relaxed text-navy-700/90">
        {ministry.description ?? "Content for this ministry is coming soon."}
      </p>
    </section>
  );
}
