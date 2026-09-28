import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawl the public surface, skip signed-in pages. Those pages redirect a
 * crawler to /login anyway; disallowing them saves crawl budget and keeps
 * "Redirecting to sign in…" shells out of search results.
 *
 * Note robots.txt is a request, not access control. Every private page is
 * protected by auth on the server regardless of what is listed here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/profile", "/upload", "/projects", "/recruiter", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
