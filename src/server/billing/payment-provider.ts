// Payment providers behind one shape, so a Vietnamese QR bank-transfer
// provider (SePay or PayOS) can sit next to Polar later.
//
// Polar is wired through the Better Auth plugin (checkout, portal, webhooks
// in src/lib/auth.ts) and feeds src/server/billing/polar-sync.ts. A new
// provider implements this interface and turns its webhook into the same
// normalized events, which are applied with the same idempotent writes
// (subscriptions upsert, credits keyed by external id).
//
// TODO(payments): implement SePay/PayOS once API keys exist:
//   1. createCheckout → create a payment request, return its QR/pay URL.
//   2. route /api/payments/<provider>/webhook → verify signature/HMAC,
//      dedupe via webhook_events, map to PaymentEvent, apply.
//   3. Bank transfers are one-off: sell Pro as 1/3/12-month passes
//      (subscriptions row with endsAt) rather than auto-renewing plans.

export type ProductKey = "pro_monthly" | "pro_yearly" | "voice_60" | "voice_300";

export type PaymentEvent =
  | {
      type: "subscription.updated";
      userId: string;
      externalId: string;
      status: string;
      currentPeriodEnd: Date | null;
      endsAt: Date | null;
    }
  | { type: "order.paid"; userId: string; externalId: string; voiceMinutes: number };

export interface PaymentProvider {
  id: "polar" | "sepay" | "payos";
  createCheckout(params: { userId: string; product: ProductKey; successUrl: string }): Promise<{ url: string }>;
  parseWebhook(request: Request): Promise<PaymentEvent[]>;
}
