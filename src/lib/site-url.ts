/**
 * The website's public address (no trailing slash), or undefined if unknown.
 * Needed for share previews, which require absolute links.
 *
 * Set NEXT_PUBLIC_SITE_URL explicitly, or on Vercel it is picked up automatically
 * from the project's production domain.
 */
export function getSiteUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercelDomain ? `https://${vercelDomain}` : undefined;
}
