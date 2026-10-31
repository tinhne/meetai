import "server-only";

import { and, count, eq, gte, sum } from "drizzle-orm";

import { db } from "@/db";
import { agents, usageEvents } from "@/db/schema";
import { PLANS, startOfUtcMonth, type PlanLimits } from "@/config/plans";
import { polarClient } from "@/lib/polar";

type UsageKind = (typeof usageEvents.$inferInsert)["kind"];

export async function getUserPlan(userId: string): Promise<PlanLimits> {
  const customer = await polarClient.customers.getStateExternal({
    externalId: userId,
  });

  return customer.activeSubscriptions.length > 0 ? PLANS.pro : PLANS.free;
}

export async function getMonthlyUsage(userId: string, kind: UsageKind) {
  const [row] = await db
    .select({ total: sum(usageEvents.quantity) })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, kind),
        gte(usageEvents.createdAt, startOfUtcMonth()),
      ),
    );

  return Number(row?.total ?? 0);
}

export async function getAgentCount(userId: string) {
  const [row] = await db
    .select({ count: count(agents.id) })
    .from(agents)
    .where(eq(agents.userId, userId));

  return row?.count ?? 0;
}
