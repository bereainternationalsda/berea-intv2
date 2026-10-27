// Used whenever Firebase isn't configured or a collection is empty, so the
// site renders real content out of the box. Once documents exist in Firestore
// (see scripts/migrate-sanity-to-firebase.mjs), live data takes over.

export type CardItem = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
};

export type SiteSettings = {
  heroEyebrow?: string;
  heroHeadline: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
};

export const fallbackSiteSettings: SiteSettings = {
  heroEyebrow: "Welcome Home",
  heroHeadline: "Berea International Seventh-day Adventist Church",
  heroSubtitle:
    "A place to worship, grow, and belong. Join our family as we discover freedom, healing, and hope in Jesus Christ together.",
};

export const fallbackSections: CardItem[] = [
  {
    _id: "fallback-departments",
    title: "Departments",
    slug: "departments",
    description:
      "Meet the ministries and teams that carry out the church's mission, from youth to community outreach.",
    icon: "🏛️",
  },
  {
    _id: "fallback-services",
    title: "Services",
    slug: "services",
    description:
      "Service times, worship styles, and ways to join us in person or online each week.",
    icon: "⛪",
  },
  {
    _id: "fallback-resources",
    title: "Resources",
    slug: "resources",
    description:
      "Bible study guides, sermons, forms, and other materials to help you grow in faith.",
    icon: "📚",
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
    },
    {
      _id: "fallback-adventurers",
      title: "Adventurers",
      slug: "adventurers",
      description: "A family-centered program for younger children to explore faith and fun together.",
      icon: "⭐",
    },
    {
      _id: "fallback-family-life",
      title: "Family Life",
      slug: "family-life",
      description: "Resources and events supporting strong marriages, parenting, and family bonds.",
      icon: "👨‍👩‍👧‍👦",
    },
    {
      _id: "fallback-ambassador",
      title: "Ambassador",
      slug: "ambassador",
      description: "Equipping young adults to lead and represent Christ in every part of life.",
      icon: "🎓",
    },
    {
      _id: "fallback-childrens-ministries",
      title: "Children's Ministries",
      slug: "childrens-ministries",
      description: "Nurturing the youngest members of our church family in the love of Jesus.",
      icon: "🧒",
    },
    {
      _id: "fallback-community-services",
      title: "Adventist Community Services",
      slug: "adventist-community-services",
      description: "Serving our neighbors through outreach, relief, and practical compassion.",
      icon: "🤝",
    },
  ],
  services: [],
  resources: [],
};
