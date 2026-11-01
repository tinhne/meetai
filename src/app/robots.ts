import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

// Private areas (app, calls, invites, share and print views) stay out of search.
const PRIVATE = ["/dashboard", "/call", "/j/", "/s/", "/print"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...PRIVATE, ...PRIVATE.map((path) => `/en${path}`)],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
