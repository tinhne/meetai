// Display prices for the marketing site. Checkout happens through Polar
// products; keep these in sync with the products configured there.

export type BillingCycle = "monthly" | "yearly";
export type Currency = "VND" | "USD";

export interface PricePoint {
  VND: number;
  USD: number;
}

export type PricingFeature =
  | "meetings5" | "agents1" | "voice10" | "recording60" | "participants3" | "notes" | "askAi"
  | "meetingsUnlimited" | "agentsUnlimited" | "voice60" | "recording600" | "participants10"
  | "templates" | "share" | "priority"
  | "everythingPro" | "workspace" | "sharedMemory" | "admin" | "seats";

export interface PricingPlan {
  id: "free" | "pro" | "team";
  highlighted?: boolean;
  monthly: PricePoint | null;
  // Total billed per year (two months free); shown per month on the site.
  yearly: PricePoint | null;
  // Translated under landing.pricing.features
  features: PricingFeature[];
  available: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    monthly: { VND: 0, USD: 0 },
    yearly: { VND: 0, USD: 0 },
    features: ["meetings5", "agents1", "voice10", "recording60", "participants3", "notes", "askAi"],
    available: true,
  },
  {
    id: "pro",
    highlighted: true,
    monthly: { VND: 199_000, USD: 7.99 },
    yearly: { VND: 1_990_000, USD: 79 },
    features: [
      "meetingsUnlimited",
      "agentsUnlimited",
      "voice60",
      "recording600",
      "participants10",
      "templates",
      "share",
      "priority",
    ],
    available: true,
  },
  {
    id: "team",
    monthly: { VND: 119_000, USD: 5 },
    yearly: { VND: 1_188_000, USD: 48 },
    features: ["everythingPro", "workspace", "sharedMemory", "admin", "seats"],
    available: false,
  },
];

// One-time AI voice minute packs (Polar one-time products with
// `voice_minutes` metadata). Priced above the all-in cost per AI minute
// (OpenAI realtime + Stream + Gemini), see docs/PRODUCT_PLAN.md section 6.
export const VOICE_CREDIT_PACKS = [
  { minutes: 60, price: { VND: 179_000, USD: 6.99 } },
  { minutes: 200, price: { VND: 499_000, USD: 19.99 } },
];

// Per-month amount shown for yearly billing.
export function monthlyEquivalent(yearly: PricePoint): PricePoint {
  return { VND: Math.round(yearly.VND / 12 / 1000) * 1000, USD: Math.round((yearly.USD / 12) * 100) / 100 };
}
