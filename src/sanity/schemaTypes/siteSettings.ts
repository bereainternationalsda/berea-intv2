import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      description: "The full-width photo shown behind the homepage hero text.",
      options: { hotspot: true },
    }),
    defineField({
      name: "heroEyebrow",
      title: "Hero Eyebrow Text",
      type: "string",
      initialValue: "Welcome Home",
    }),
    defineField({
      name: "heroHeadline",
      title: "Hero Headline",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "heroSubtitle",
      title: "Hero Subtitle",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Settings" };
    },
  },
});
