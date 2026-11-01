// Plan limits (docs/PRODUCT_PLAN.md section 6). `null` means unlimited.
// Team and Business are sold later; until then they are not plan ids here.

export type PlanId = "free" | "pro";

export interface PlanLimits {
  id: PlanId;
  // Meetings created per calendar month (UTC). Deleting does not refund.
  meetingsPerMonth: number | null;
  // Minutes of recorded meetings per calendar month (UTC).
  recordingMinutesPerMonth: number | null;
  // Agents that can exist at the same time.
  maxAgents: number | null;
  askAiPerHour: number;
  // Minutes of AI speech per calendar month (UTC), before credit packs.
  aiVoiceMinutesPerMonth: number;
  // People in a call at once, host included (the AI is not counted).
  maxParticipants: number;
  // How long recordings are kept (shown on the billing page).
  recordingRetentionDays: number;
  // Knowledge base documents per account (0 = feature locked).
  knowledgeDocuments: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    meetingsPerMonth: 5,
    recordingMinutesPerMonth: 60,
    maxAgents: 1,
    askAiPerHour: 20,
    aiVoiceMinutesPerMonth: 10,
    maxParticipants: 3,
    recordingRetentionDays: 7,
    knowledgeDocuments: 0,
  },
  pro: {
    id: "pro",
    meetingsPerMonth: null,
    recordingMinutesPerMonth: 600,
    maxAgents: null,
    askAiPerHour: 120,
    aiVoiceMinutesPerMonth: 60,
    maxParticipants: 10,
    recordingRetentionDays: 90,
    knowledgeDocuments: 20,
  },
};

// Subscription statuses that grant the paid plan. past_due keeps access while
// Polar retries the payment.
export const PAID_STATUSES = ["active", "trialing", "past_due"] as const;

// Share of a monthly quota at which the warning email is sent.
export const QUOTA_WARNING_RATIO = 0.8;

export function isWithinLimit(limit: number | null, used: number) {
  return limit === null || used < limit;
}

export function startOfUtcMonth(now: Date = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function monthKey(now: Date = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function remainingVoiceSeconds(plan: PlanLimits, usedSeconds: number) {
  return Math.max(0, plan.aiVoiceMinutesPerMonth * 60 - usedSeconds);
}

// Splits new AI speech between the monthly allowance and prepaid credits.
export function splitVoiceUsage(allowanceSeconds: number, usedBefore: number, seconds: number) {
  const fromPlan = Math.max(0, Math.min(seconds, allowanceSeconds - usedBefore));
  return { fromPlan, fromCredits: seconds - fromPlan };
}
