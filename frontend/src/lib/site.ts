/**
 * Site identity, used by metadata, the sitemap, robots.txt and the social
 * preview image. `NEXT_PUBLIC_SITE_URL` overrides the canonical origin (e.g. for
 * a staging deploy); production falls back to the apex domain.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://roastforge.tech").replace(/\/+$/, "");

export const SITE_NAME = "RoastForge";

export const SITE_TAGLINE = "Resume Roasting & Talent Discovery";

export const SITE_DESCRIPTION =
  "Upload resumes for AI analysis, get community feedback, showcase projects, and let recruiters discover high-signal candidates.";

/** Brand teal, the fill used for the app icon and social preview. */
export const BRAND_TEAL = "#43999D";

/** The flame mark from `components/icons/flame-icon.tsx`, as a bare path. */
export const FLAME_PATH =
  "M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.621 -2.333 5.588c0 3.704 3.134 6.706 7 6.706s7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235";
