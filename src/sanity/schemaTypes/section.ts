import { defineField, defineType } from "sanity";

export const section = defineType({
  name: "section",
  title: "Homepage Section",
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
      description: "Used as the page route, e.g. 'departments' -> /departments",
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
      description: "A single emoji shown on the card, e.g. 🏛️",
    }),
    defineField({
      name: "image",
      title: "Card Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "description" },
  },
});
