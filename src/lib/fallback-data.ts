// Used whenever Sanity isn't configured yet, so the site renders real content
// out of the box. Once NEXT_PUBLIC_SANITY_PROJECT_ID is set and documents are
// seeded in the Studio, live data from Sanity takes over automatically.

export type CardItem = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: null;
};

export const fallbackSections: CardItem[] = [
  {
    _id: "fallback-departments",
    title: "Departments",
    slug: "departments",
    description:
      "Meet the ministries and teams that carry out the church's mission, from youth to community outreach.",
    icon: "🏛️",
    image: null,
  },
  {
    _id: "fallback-services",
    title: "Services",
    slug: "services",
    description:
      "Service times, worship styles, and ways to join us in person or online each week.",
    icon: "⛪",
    image: null,
  },
  {
    _id: "fallback-resources",
    title: "Resources",
    slug: "resources",
    description:
      "Bible study guides, sermons, forms, and other materials to help you grow in faith.",
    icon: "📚",
    image: null,
  },
];

export const fallbackMinistries: Record<string, CardItem[]> = {
  departments: [
    {
      _id: "fallback-pathfinders",
      title: "Pathfinders",
      slug: "pathfinders",
      description: "An adventure-based program helping youth grow in character and faith.",
      icon: "🧭",
      image: null,
    },
    {
      _id: "fallback-adventurers",
      title: "Adventurers",
      slug: "adventurers",
      description: "A family-centered program for younger children to explore faith and fun together.",
      icon: "⭐",
      image: null,
    },
    {
      _id: "fallback-family-life",
      title: "Family Life",
      slug: "family-life",
      description: "Resources and events supporting strong marriages, parenting, and family bonds.",
      icon: "👨‍👩‍👧‍👦",
      image: null,
    },
    {
      _id: "fallback-ambassador",
      title: "Ambassador",
      slug: "ambassador",
      description: "Equipping young adults to lead and represent Christ in every part of life.",
      icon: "🎓",
      image: null,
    },
    {
      _id: "fallback-childrens-ministries",
      title: "Children's Ministries",
      slug: "childrens-ministries",
      description: "Nurturing the youngest members of our church family in the love of Jesus.",
      icon: "🧒",
      image: null,
    },
    {
      _id: "fallback-community-services",
      title: "Adventist Community Services",
      slug: "adventist-community-services",
      description: "Serving our neighbors through outreach, relief, and practical compassion.",
      icon: "🤝",
      image: null,
    },
  ],
  services: [],
  resources: [],
};
