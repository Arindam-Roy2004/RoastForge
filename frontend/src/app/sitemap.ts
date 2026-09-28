import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public, indexable pages only — the same set robots.txt allows.
 *
 * Individual resume pages are deliberately not listed. Adding them means
 * fetching the API at build time, which ties every frontend deploy to the
 * backend being reachable; and they are already discoverable through the
 * gallery links on the home page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; changeFrequency: "daily" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/try", changeFrequency: "monthly", priority: 0.8 },
    { path: "/login", changeFrequency: "yearly", priority: 0.3 },
    { path: "/register", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency,
    priority,
  }));
}
