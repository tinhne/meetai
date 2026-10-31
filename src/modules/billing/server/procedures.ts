import { z } from "zod";

import { PLANS } from "@/config/plans";
import { db } from "@/db";
import { polarClient } from "@/lib/polar";
import { getActiveSubscription, getMonthlyUsage, getVoiceAllowance } from "@/server/billing/ledger";
import { getUserPlan } from "@/server/billing/plan";
import { syncCustomerFromPolar, syncPaidOrders } from "@/server/billing/polar-sync";
import { getAgentCount, getRecordedMinutes } from "@/server/billing/quota";
import { enforceRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function priceOf(product: Awaited<ReturnType<typeof polarClient.products.list>>["result"]["items"][number]) {
  const price = product.prices.find((item) => item.amountType === "fixed" && !item.isArchived);
  return price && "priceAmount" in price
    ? { amount: price.priceAmount, currency: price.priceCurrency }
    : null;
}

export const billingRouter = createTRPCRouter({
  // Plan, subscription and this month's usage, all from the local database.
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const plan = await getUserPlan(userId);
    const [subscription, meetingCount, recordedMinutes, agentCount, voice] = await Promise.all([
      getActiveSubscription(db, userId),
      getMonthlyUsage(db, userId, "meeting_created"),
      getRecordedMinutes(userId),
      getAgentCount(userId),
      getVoiceAllowance(db, userId, plan),
    ]);

    return {
      plan,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      usage: {
        meetings: { used: meetingCount, limit: plan.meetingsPerMonth },
        recordingMinutes: { used: recordedMinutes, limit: plan.recordingMinutesPerMonth },
        agents: { used: agentCount, limit: plan.maxAgents },
        aiVoice: {
          usedMinutes: Math.ceil(voice.usedSeconds / 60),
          includedMinutes: plan.aiVoiceMinutesPerMonth,
          creditMinutes: Math.floor(voice.creditSeconds / 60),
          remainingMinutes: Math.floor(voice.remainingSeconds / 60),
        },
      },
      pro: PLANS.pro,
    };
  }),

  // Polar catalog: recurring plans and one-time voice minute packs.
  getProducts: protectedProcedure.query(async () => {
    const response = await polarClient.products.list({ isArchived: false, limit: 50 });
    const items = response.result.items;

    return {
      plans: items
        .filter((product) => product.isRecurring)
        .map((product) => ({
          id: product.id,
          name: product.name,
          interval: product.recurringInterval,
          price: priceOf(product),
        }))
        .sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0)),
      voicePacks: items
        .filter((product) => !product.isRecurring && Number(product.metadata.voice_minutes) > 0)
        .map((product) => ({
          id: product.id,
          name: product.name,
          minutes: Math.floor(Number(product.metadata.voice_minutes)),
          price: priceOf(product),
        }))
        .sort((a, b) => a.minutes - b.minutes),
    };
  }),

  getOrders: protectedProcedure.query(async ({ ctx }) => {
    try {
      const response = await polarClient.orders.list({ externalCustomerId: ctx.auth.user.id, limit: 20 });
      return response.result.items.map((order) => ({
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        productName: order.product?.name ?? "Meet.AI",
        amount: order.totalAmount,
        currency: order.currency,
        status: order.status,
        billingReason: order.billingReason,
      }));
    } catch (error) {
      console.error("[billing] Orders lookup failed:", error instanceof Error ? error.name : "unknown");
      return [];
    }
  }),

  // Pulls the latest state from Polar (after checkout, or if a webhook was
  // missed). Rate limited because it calls Polar.
  sync: protectedProcedure
    .input(z.object({ reason: z.enum(["checkout", "manual"]).default("manual") }).optional())
    .mutation(async ({ ctx }) => {
      await enforceRateLimit("billingSync", ctx.auth.user.id);
      await syncCustomerFromPolar(ctx.auth.user.id);
      await syncPaidOrders(ctx.auth.user.id);
      const plan = await getUserPlan(ctx.auth.user.id);
      return { planId: plan.id };
    }),
});
