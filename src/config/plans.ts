// Plan limits. `null` means unlimited.
// Phase 0 enforces meetings/agents/Ask AI; minute-based quotas come later.

export type PlanId = "free" | "pro";

export interface PlanLimits {
  id: PlanId;
  // Meetings created per calendar month (UTC). Deleting does not refund.
  meetingsPerMonth: number | null;
  // Agents that can exist at the same time.
  maxAgents: number | null;
  askAiPerHour: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    meetingsPerMonth: 5,
    maxAgents: 1,
    askAiPerHour: 20,
  },
  pro: {
    id: "pro",
    meetingsPerMonth: null,
    maxAgents: null,
    askAiPerHour: 120,
  },
};

export function isWithinLimit(limit: number | null, used: number) {
  return limit === null || used < limit;
}

export function startOfUtcMonth(now: Date = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
