import { describe, expect, it } from "vitest";

import { buildAlternates, formatPrice, localizedPath } from "./seo";

describe("localizedPath", () => {
  it("keeps Vietnamese at the root and prefixes English", () => {
    expect(localizedPath("/", "vi")).toBe("/");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/pricing", "vi")).toBe("/pricing");
    expect(localizedPath("/pricing/", "en")).toBe("/en/pricing");
  });
});

describe("buildAlternates", () => {
  it("returns canonical and hreflang links for both languages", () => {
    expect(buildAlternates("/blog/x", "en")).toEqual({
      canonical: "/en/blog/x",
      languages: { vi: "/blog/x", en: "/en/blog/x", "x-default": "/blog/x" },
    });
  });
});

describe("formatPrice", () => {
  it("formats VND and USD without decimals", () => {
    expect(formatPrice(149_000, "VND", "vi").replace(/\s/g, " ")).toMatch(/149\.000/);
    expect(formatPrice(6, "USD", "en")).toBe("$6");
  });
});
