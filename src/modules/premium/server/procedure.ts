import { polarClient } from "@/lib/polar";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getAgentCount, getMonthlyUsage, getUserPlan } from "./usage";

export const premiumRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const subscription = customer.activeSubscriptions[0];

    if (!subscription) {
      return null;
    }

    const product = await polarClient.products.get({
      id: subscription.productId,
    });

    return product;
  }),
  getProducts: protectedProcedure.query(async () => {
    const products = await polarClient.products.list({
      isArchived: false,
      isRecurring: true,
      sorting: ["price_amount"],
    });
    return products.result.items;
  }),
  getFreeUsage: protectedProcedure.query(async ({ ctx }) => {
    const plan = await getUserPlan(ctx.auth.user.id);

    if (plan.id !== "free") {
      return null;
    }

    const [meetingCount, agentCount] = await Promise.all([
      getMonthlyUsage(ctx.auth.user.id, "meeting_created"),
      getAgentCount(ctx.auth.user.id),
    ]);

    return {
      meetingCount,
      meetingLimit: plan.meetingsPerMonth,
      agentCount,
      agentLimit: plan.maxAgents,
    };
  }),
});
