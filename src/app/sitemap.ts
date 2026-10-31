import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/content/blog";
import { LEGAL_PAGES } from "@/content/legal";
import { USE_CASES } from "@/content/use-cases";
import { SEO_LOCALES, absoluteUrl, localizedPath } from "@/lib/seo";

type Entry = { path: string; priority: number; lastModified?: string };

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: Entry[] = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.9 },
    ...USE_CASES.map((useCase) => ({ path: `/use-cases/${useCase.slug}`, priority: 0.8 })),
    { path: "/blog", priority: 0.7 },
    ...BLOG_POSTS.map((post) => ({ path: `/blog/${post.slug}`, priority: 0.6, lastModified: post.date })),
    { path: "/security", priority: 0.5 },
    { path: "/about", priority: 0.5 },
    { path: "/contact", priority: 0.4 },
    { path: "/changelog", priority: 0.4 },
    ...LEGAL_PAGES.map((page) => ({ path: `/legal/${page.slug}`, priority: 0.2, lastModified: page.updated })),
  ];

  // One URL per locale, each pointing at its translations (hreflang).
  return entries.flatMap(({ path, priority, lastModified }) => {
    const languages = Object.fromEntries(
      SEO_LOCALES.map((locale) => [locale, absoluteUrl(localizedPath(path, locale))]),
    );
    return SEO_LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(path, locale)),
      lastModified: lastModified ? new Date(lastModified) : undefined,
      priority: locale === "vi" ? priority : Math.round(priority * 0.9 * 10) / 10,
      alternates: { languages },
    }));
  });
}
