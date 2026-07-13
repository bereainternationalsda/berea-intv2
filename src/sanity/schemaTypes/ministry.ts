import { defineField, defineType } from "sanity";

export const ministry = defineType({
  name: "ministry",
  title: "Ministry / Sub-page Card",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Card Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "icon",
      title: "Icon (emoji)",
      type: "string",
    }),
    defineField({
      name: "image",
      title: "Card Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "section",
      title: "Parent Section",
      type: "reference",
      to: [{ type: "section" }],
      description: "Which homepage card this ministry belongs under (e.g. Departments)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "section.title" },
  },
});
