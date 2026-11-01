import { describe, expect, it } from "vitest";

import { PLANS, monthKey, splitVoiceUsage } from "../../config/plans";
import { evaluateQuota, QuotaExceededError, usageRatio, voiceMinutesFromOrder } from "./quota-rules";

describe("evaluateQuota", () => {
  it("allows unlimited quotas", () => {
    expect(evaluateQuota(null, 10_000)).toBe(true);
  });

  it("allows up to and including the limit", () => {
    expect(evaluateQuota(5, 4)).toBe(true);
    expect(evaluateQuota(5, 5)).toBe(false);
  });

  it("checks the amount being added", () => {
    expect(evaluateQuota(5, 3, 2)).toBe(true);
    expect(evaluateQuota(5, 4, 2)).toBe(false);
  });

  it("does not refund deleted items (usage only grows)", () => {
    const createdThisMonth = 5; // ledger rows stay after a delete
    expect(evaluateQuota(PLANS.free.meetingsPerMonth, createdThisMonth)).toBe(false);
  });
});

describe("usageRatio", () => {
  it("is 0 for unlimited or empty limits", () => {
    expect(usageRatio(null, 50)).toBe(0);
    expect(usageRatio(0, 50)).toBe(0);
  });

  it("reaches the 80% warning threshold", () => {
    expect(usageRatio(10, 8)).toBeGreaterThanOrEqual(0.8);
  });
});

describe("splitVoiceUsage", () => {
  it("uses the monthly allowance first", () => {
    expect(splitVoiceUsage(600, 0, 120)).toEqual({ fromPlan: 120, fromCredits: 0 });
  });

  it("spills into credits once the allowance runs out", () => {
    expect(splitVoiceUsage(600, 550, 120)).toEqual({ fromPlan: 50, fromCredits: 70 });
  });

  it("charges credits only after a downgrade left usage above the allowance", () => {
    expect(splitVoiceUsage(600, 3000, 30)).toEqual({ fromPlan: 0, fromCredits: 30 });
  });
});

describe("voiceMinutesFromOrder", () => {
  it("reads minutes from one-time products", () => {
    expect(voiceMinutesFromOrder({ product: { isRecurring: false, metadata: { voice_minutes: "60" } } })).toBe(60);
    expect(voiceMinutesFromOrder({ product: { isRecurring: false, metadata: { voice_minutes: 300 } } })).toBe(300);
  });

  it("ignores subscriptions and products without minutes", () => {
    expect(voiceMinutesFromOrder({ product: { isRecurring: true, metadata: { voice_minutes: 60 } } })).toBe(0);
    expect(voiceMinutesFromOrder({ product: { isRecurring: false, metadata: {} } })).toBe(0);
    expect(voiceMinutesFromOrder({ product: { isRecurring: false, metadata: { voice_minutes: "-5" } } })).toBe(0);
    expect(voiceMinutesFromOrder({ product: null })).toBe(0);
  });
});

describe("QuotaExceededError", () => {
  it("carries the quota context", () => {
    const info = { kind: "aiVoice" as const, planId: "free" as const, used: 10, limit: 10, allowed: false };
    expect(new QuotaExceededError(info).info).toBe(info);
  });
});

describe("monthKey", () => {
  it("is stable per UTC month", () => {
    expect(monthKey(new Date(Date.UTC(2026, 0, 31, 23, 59)))).toBe("2026-01");
  });
});
