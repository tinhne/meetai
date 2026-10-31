import "server-only";

import { eq } from "drizzle-orm";

import type { PlanLimits } from "@/config/plans";
import { db } from "@/db";
import { billingCustomers } from "@/db/schema";
import { resolvePlan } from "./ledger";
import { syncCustomerFromPolar } from "./polar-sync";

// Plan checks read the local subscriptions cache. The first time we see a
// user (e.g. they subscribed before the webhook existed) their Polar state is
// pulled once; after that only the webhook and the manual sync update it.
export async function getUserPlan(userId: string): Promise<PlanLimits> {
  const [known] = await db
    .select({ userId: billingCustomers.userId })
    .from(billingCustomers)
    .where(eq(billingCustomers.userId, userId));

  if (!known) {
    try {
      await syncCustomerFromPolar(userId);
    } catch (error) {
      console.error("[billing] Polar backfill failed:", error instanceof Error ? error.name : "unknown");
    }
  }

  return resolvePlan(db, userId);
}
