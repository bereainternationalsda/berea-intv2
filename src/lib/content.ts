import { client } from "@/sanity/client";
import { ministriesBySectionSlugQuery, sectionsQuery } from "@/sanity/queries";
import { isSanityConfigured } from "@/sanity/env";
import {
  fallbackMinistries,
  fallbackSections,
  type CardItem,
} from "@/lib/fallback-data";

export async function getSections(): Promise<CardItem[]> {
  if (!isSanityConfigured) return fallbackSections;

  try {
    const sections = await client.fetch<CardItem[]>(sectionsQuery);
    return sections.length > 0 ? sections : fallbackSections;
  } catch {
    return fallbackSections;
  }
}

export async function getMinistriesForSection(
  sectionSlug: string,
): Promise<CardItem[]> {
  if (!isSanityConfigured) return fallbackMinistries[sectionSlug] ?? [];

  try {
    const ministries = await client.fetch<CardItem[]>(
      ministriesBySectionSlugQuery,
      { sectionSlug },
    );
    return ministries.length > 0
      ? ministries
      : fallbackMinistries[sectionSlug] ?? [];
  } catch {
    return fallbackMinistries[sectionSlug] ?? [];
  }
}
