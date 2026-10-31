// schema.org builders for marketing pages.

import { PRICING_PLANS } from "@/config/pricing";
import { SITE } from "@/config/site";
import { absoluteUrl, localizedPath } from "@/lib/seo";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    sameAs: [SITE.github],
  };
}

export function websiteSchema(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl(localizedPath("/", locale)),
    inLanguage: locale === "en" ? "en" : "vi",
  };
}

export function softwareApplicationSchema(locale: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    url: absoluteUrl(localizedPath("/", locale)),
    offers: PRICING_PLANS.filter((plan) => plan.available && plan.monthly).map((plan) => ({
      "@type": "Offer",
      name: plan.id,
      price: plan.monthly![locale === "en" ? "USD" : "VND"],
      priceCurrency: locale === "en" ? "USD" : "VND",
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[], locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizedPath(item.path, locale)),
    })),
  };
}
