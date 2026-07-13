import { client } from "@/sanity/client";
import {
  ministriesBySectionSlugQuery,
  sectionsQuery,
  siteSettingsQuery,
} from "@/sanity/queries";
import { isSanityConfigured } from "@/sanity/env";
import {
  fallbackMinistries,
  fallbackSections,
  fallbackSiteSettings,
  type CardItem,
  type SiteSettings,
} from "@/lib/fallback-data";

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSanityConfigured) return fallbackSiteSettings;

  try {
    const settings = await client.fetch<SiteSettings | null>(siteSettingsQuery);
    return settings ?? fallbackSiteSettings;
  } catch {
    return fallbackSiteSettings;
  }
}

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
