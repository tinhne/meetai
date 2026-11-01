// SEO helpers: localized URLs, canonical + hreflang alternates.

import { SITE } from "@/config/site";

export const SEO_LOCALES = ["vi", "en"] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

// Vietnamese lives at "/", English under "/en".
export function localizedPath(path: string, locale: string) {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  if (locale === "en") return `/en${clean}` || "/en";
  return clean || "/";
}

export function absoluteUrl(path: string) {
  return `${SITE.url}${path === "/" ? "" : path}`;
}

export function buildAlternates(path: string, locale: string) {
  return {
    canonical: localizedPath(path, locale),
    languages: {
      vi: localizedPath(path, "vi"),
      en: localizedPath(path, "en"),
      "x-default": localizedPath(path, "vi"),
    },
  };
}

export function formatPrice(amount: number, currency: "VND" | "USD", locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
