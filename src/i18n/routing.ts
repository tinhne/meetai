import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  // Vietnamese lives at "/", English at "/en".
  localePrefix: "as-needed",
  // The URL alone decides the language (no Accept-Language redirects), so
  // Vietnamese users with English browsers still land on the Vietnamese site.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

export function toAppLocale(value: string): AppLocale {
  return value === "en" ? "en" : "vi";
}
