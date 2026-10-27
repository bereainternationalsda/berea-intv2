import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  getAdminEvents,
  getAdminMinistries,
  getAdminSections,
} from "@/lib/admin/data";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [sections, ministries, events] = await Promise.all([
    getAdminSections(),
    getAdminMinistries(),
    getAdminEvents(),
  ]);

  const tiles = [
    {
      href: "/admin/settings",
      title: "Site settings",
      body: "The homepage hero: its photo, heading and subtitle.",
    },
    {
      href: "/admin/sections",
      title: "Section cards",
      body: `The ${sections.length} big cards on the homepage (Departments, Services, Resources).`,
    },
    {
      href: "/admin/ministries",
      title: "Ministry cards",
      body: `The ${ministries.length} cards inside each section, like Pathfinders and Adventurers.`,
    },
    {
      href: "/admin/events",
      title: "Events",
      body:
        events.length === 0
          ? "Camps, trainings and other programs to promote. None yet."
          : `Camps, trainings and other programs to promote. ${events.length} so far.`,
    },
  ];

  return (
    <>
      <PageHeader
        title="What would you like to edit?"
        description="Changes go live on the website within a few seconds of saving."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="font-serif text-lg font-bold text-navy-900">{tile.title}</h2>
            <p className="mt-2 text-sm text-navy-700/80">{tile.body}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-navy-600">
              Open &rarr;
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
