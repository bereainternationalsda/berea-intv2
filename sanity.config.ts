import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import type { StructureBuilder } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schemaTypes } from "./src/sanity/schemaTypes";

const singletonTypes = new Set(["siteSettings"]);

function structure(S: StructureBuilder) {
  return S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Site Settings")
        .id("siteSettings")
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings"),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => !singletonTypes.has(item.getId() ?? ""),
      ),
    ]);
}

export default defineConfig({
  basePath: "/studio",
  name: "berea-int",
  title: "Berea Church CMS",
  projectId: projectId || "placeholder",
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
  document: {
    // Prevent creating extra Site Settings documents or deleting the only one.
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === "global") {
        return prev.filter((item) => item.templateId !== "siteSettings");
      }
      return prev;
    },
    actions: (prev, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? prev.filter(
            ({ action }) => action && !["delete", "duplicate"].includes(action),
          )
        : prev,
  },
});
