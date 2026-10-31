import { describe, expect, it } from "vitest";

import { PLANS, isWithinLimit, startOfUtcMonth } from "./plans";

describe("isWithinLimit", () => {
  it("allows usage below the limit", () => {
    expect(isWithinLimit(5, 4)).toBe(true);
  });

  it("blocks usage at the limit", () => {
    expect(isWithinLimit(5, 5)).toBe(false);
    expect(isWithinLimit(PLANS.free.maxAgents, 1)).toBe(false);
  });

  it("treats null as unlimited", () => {
    expect(isWithinLimit(null, 10_000)).toBe(true);
    expect(isWithinLimit(PLANS.pro.meetingsPerMonth, 999)).toBe(true);
  });
});

describe("startOfUtcMonth", () => {
  it("returns the first instant of the UTC month", () => {
    const start = startOfUtcMonth(new Date("2026-11-17T23:59:00.000Z"));
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});
