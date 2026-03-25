export const RESERVED_SLUGS = [
  "builder",
  "dashboard",
  "auth",
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number]);
}
