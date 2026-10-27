// Seeds initial Sanity content so the site has real, editable documents
// instead of relying on the built-in fallback data.
//
// Usage:
//   node --env-file=.env.local scripts/seed.mjs

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN. " +
      "Copy .env.local.example to .env.local and fill both in first.",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

const siteSettings = {
  _id: "siteSettings",
  _type: "siteSettings",
  heroEyebrow: "Welcome Home",
  heroHeadline: "Berea International Seventh-day Adventist Church",
  heroSubtitle:
    "A place to worship, grow, and belong. Join our family as we discover freedom, healing, and hope in Jesus Christ together.",
};

const sections = [
  {
    _id: "section-departments",
    _type: "section",
    title: "Departments",
    slug: { _type: "slug", current: "departments" },
    description:
      "Meet the ministries and teams that carry out the church's mission, from youth to community outreach.",
    icon: "🏛️",
    order: 1,
  },
  {
    _id: "section-services",
    _type: "section",
    title: "Services",
    slug: { _type: "slug", current: "services" },
    description:
      "Service times, worship styles, and ways to join us in person or online each week.",
    icon: "⛪",
    order: 2,
  },
  {
    _id: "section-resources",
    _type: "section",
    title: "Resources",
    slug: { _type: "slug", current: "resources" },
    description:
      "Bible study guides, sermons, forms, and other materials to help you grow in faith.",
    icon: "📚",
    order: 3,
  },
];

const ministries = [
  { title: "Pathfinders", slug: "pathfinders", icon: "🧭", description: "An adventure-based program helping youth grow in character and faith." },
  { title: "Adventurers", slug: "adventurers", icon: "⭐", description: "A family-centered program for younger children to explore faith and fun together." },
  { title: "Family Life", slug: "family-life", icon: "👨‍👩‍👧‍👦", description: "Resources and events supporting strong marriages, parenting, and family bonds." },
  { title: "Ambassador", slug: "ambassador", icon: "🎓", description: "Equipping young adults to lead and represent Christ in every part of life." },
  { title: "Children's Ministries", slug: "childrens-ministries", icon: "🧒", description: "Nurturing the youngest members of our church family in the love of Jesus." },
  { title: "Adventist Community Services", slug: "adventist-community-services", icon: "🤝", description: "Serving our neighbors through outreach, relief, and practical compassion." },
].map((ministry, index) => ({
  _id: `ministry-${ministry.slug}`,
  _type: "ministry",
  title: ministry.title,
  slug: { _type: "slug", current: ministry.slug },
  description: ministry.description,
  icon: ministry.icon,
  order: index + 1,
  section: { _type: "reference", _ref: "section-departments" },
}));

async function seed() {
  const transaction = client.transaction();

  for (const doc of [siteSettings, ...sections, ...ministries]) {
    transaction.createOrReplace(doc);
  }

  await transaction.commit();
  console.log(
    `Seeded site settings, ${sections.length} sections, and ${ministries.length} ministries.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
