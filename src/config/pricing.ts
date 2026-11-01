// Display prices for the marketing site. Checkout happens through Polar
// products; keep these in sync with the products configured there.

export type BillingCycle = "monthly" | "yearly";
export type Currency = "VND" | "USD";

export interface PricePoint {
  VND: number;
  USD: number;
}

export type PricingFeature =
  | "meetings5" | "agents1" | "voice10" | "participants3" | "notes" | "askAi"
  | "meetingsUnlimited" | "agentsUnlimited" | "voice60" | "participants10"
  | "templates" | "share" | "priority"
  | "everythingPro" | "workspace" | "sharedMemory" | "admin" | "seats";

export interface PricingPlan {
  id: "free" | "pro" | "team";
  highlighted?: boolean;
  monthly: PricePoint | null;
  // Yearly price per month (two months free).
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
    features: ["meetings5", "agents1", "voice10", "participants3", "notes", "askAi"],
    available: true,
  },
  {
    id: "pro",
    highlighted: true,
    monthly: { VND: 149_000, USD: 6 },
    yearly: { VND: 124_000, USD: 5 },
    features: ["meetingsUnlimited", "agentsUnlimited", "voice60", "participants10", "templates", "share", "priority"],
    available: true,
  },
  {
    id: "team",
    monthly: { VND: 119_000, USD: 5 },
    yearly: { VND: 99_000, USD: 4 },
    features: ["everythingPro", "workspace", "sharedMemory", "admin", "seats"],
    available: false,
  },
];

export const VOICE_CREDIT_PACKS = [
  { minutes: 60, price: { VND: 79_000, USD: 3 } },
  { minutes: 300, price: { VND: 299_000, USD: 12 } },
];
