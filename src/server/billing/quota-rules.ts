// Pure quota rules (no I/O) so they can be unit tested and shared with the
// tRPC error formatter.

import type { PlanId } from "../../config/plans";

export type QuotaKind = "meetings" | "recordingMinutes" | "agents" | "aiVoice" | "knowledgeDocuments";

export interface QuotaInfo {
  kind: QuotaKind;
  planId: PlanId;
  used: number;
  // null = unlimited
  limit: number | null;
  allowed: boolean;
}

// `amount` is what the action is about to add (1 meeting, 1 agent, …).
export function evaluateQuota(limit: number | null, used: number, amount = 1) {
  return limit === null || used + amount <= limit;
}

export function usageRatio(limit: number | null, used: number) {
  if (limit === null || limit <= 0) return 0;
  return used / limit;
}

// Carried as the TRPCError cause; the error formatter exposes `info` to the
// client, which opens the upgrade dialog with this context.
export class QuotaExceededError extends Error {
  constructor(readonly info: QuotaInfo) {
    super(`Quota exceeded: ${info.kind} (${info.used}/${info.limit ?? "∞"}) on the ${info.planId} plan`);
    this.name = "QuotaExceededError";
  }
}

// Voice credit packs are one-time Polar products with `voice_minutes` metadata.
export function voiceMinutesFromOrder(order: {
  product: { isRecurring: boolean; metadata: Record<string, unknown> } | null;
}) {
  if (!order.product || order.product.isRecurring) return 0;
  const minutes = Number(order.product.metadata.voice_minutes);
  return Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
}
