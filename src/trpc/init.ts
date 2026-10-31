import { auth } from "@/lib/auth";
import { isWithinLimit } from "@/config/plans";
import {
  getAgentCount,
  getMonthlyUsage,
  getUserPlan,
} from "@/modules/premium/server/usage";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return {};
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  return next({
    ctx: {
      ...ctx,
      auth: session,
    },
  });
});

export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const userId = ctx.auth.user.id;
    const plan = await getUserPlan(userId);

    if (entity === "meetings") {
      const used = await getMonthlyUsage(userId, "meeting_created");
      if (!isWithinLimit(plan.meetingsPerMonth, used)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You have used all ${plan.meetingsPerMonth} meetings included this month. Please upgrade to create more.`,
        });
      }
    } else {
      const used = await getAgentCount(userId);
      if (!isWithinLimit(plan.maxAgents, used)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your plan includes ${plan.maxAgents} agent(s). Please upgrade to create more.`,
        });
      }
    }

    return next({ ctx: { ...ctx, plan } });
  });
