import { groq } from "next-sanity";

export const sectionsQuery = groq`
  *[_type == "section"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    icon,
    image
  }
`;

export const ministriesBySectionSlugQuery = groq`
  *[_type == "ministry" && section->slug.current == $sectionSlug] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    icon,
    image
  }
`;
