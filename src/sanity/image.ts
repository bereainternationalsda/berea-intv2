import createImageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { dataset, projectId } from "./env";

const imageBuilder = createImageUrlBuilder({ projectId: projectId || "placeholder", dataset });

export function urlFor(source: SanityImageSource) {
  return imageBuilder.image(source);
}
