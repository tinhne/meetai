import "server-only";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound";
import type { Order } from "@polar-sh/sdk/models/components/order";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";

import { PAID_STATUSES } from "@/config/plans";
import { db } from "@/db";
import { billingCustomers, credits, subscriptions, user } from "@/db/schema";
import { polarClient } from "@/lib/polar";
import { sendLifecycleEmail } from "./lifecycle-emails";
import { voiceMinutesFromOrder } from "./quota-rules";

type SubscriptionSnapshot = {
  id: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  endsAt: Date | null;
  metadata?: Record<string, unknown>;
};

// Products can carry `plan` metadata for future tiers; everything else is Pro.
function planFromMetadata(metadata: Record<string, unknown> | undefined) {
  return metadata?.plan === "team" ? "team" : "pro";
}

export async function upsertSubscription(userId: string, snapshot: SubscriptionSnapshot) {
  const values = {
    userId,
    productId: snapshot.productId,
    plan: planFromMetadata(snapshot.metadata),
    status: snapshot.status,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    endsAt: snapshot.endsAt,
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values({ id: snapshot.id, ...values })
    .onConflictDoUpdate({ target: subscriptions.id, set: values });
}

async function markSynced(userId: string, polarCustomerId: string | null) {
  await db
    .insert(billingCustomers)
    .values({ userId, polarCustomerId, syncedAt: new Date() })
    .onConflictDoUpdate({
      target: billingCustomers.userId,
      set: { polarCustomerId, syncedAt: new Date() },
    });
}

// Pulls the customer's active subscriptions from Polar into the cache.
export async function syncCustomerFromPolar(userId: string) {
  let state;
  try {
    state = await polarClient.customers.getStateExternal({ externalId: userId });
  } catch (error) {
    if (error instanceof ResourceNotFound) {
      await markSynced(userId, null);
      return;
    }
    throw error;
  }

  const activeIds = state.activeSubscriptions.map((subscription) => subscription.id);
  for (const subscription of state.activeSubscriptions) {
    await upsertSubscription(userId, subscription);
  }

  // Anything we still think is paid but Polar no longer lists has ended.
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, [...PAID_STATUSES]),
        activeIds.length > 0 ? notInArray(subscriptions.id, activeIds) : undefined,
      ),
    );

  await markSynced(userId, state.id);
}

async function findUserId(externalId: string | null | undefined, polarCustomerId: string) {
  if (externalId) {
    const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, externalId));
    if (row) return row.id;
  }
  const [row] = await db
    .select({ userId: billingCustomers.userId })
    .from(billingCustomers)
    .where(eq(billingCustomers.polarCustomerId, polarCustomerId));
  return row?.userId ?? null;
}

export async function handleSubscriptionEvent(subscription: Subscription) {
  const userId = await findUserId(subscription.customer.externalId, subscription.customerId);
  if (!userId) {
    console.warn("[billing] Subscription event for an unknown customer");
    return;
  }

  await upsertSubscription(userId, {
    ...subscription,
    metadata: subscription.product.metadata,
  });
  await markSynced(userId, subscription.customerId);

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    await sendLifecycleEmail(userId, "payment_failed", `${subscription.id}:${subscription.currentPeriodEnd.toISOString()}`);
  }
}

// Idempotent: the order id is unique in `credits`.
async function grantOrderCredits(userId: string, order: Pick<Order, "id" | "product">) {
  const minutes = voiceMinutesFromOrder(order);
  if (minutes <= 0) return 0;
  await db
    .insert(credits)
    .values({
      userId,
      granted: minutes * 60,
      remaining: minutes * 60,
      source: "purchase",
      externalId: order.id,
    })
    .onConflictDoNothing({ target: credits.externalId });
  return minutes;
}

// Catches up on paid credit packs (missed webhooks, local development).
export async function syncPaidOrders(userId: string) {
  const response = await polarClient.orders.list({ externalCustomerId: userId, limit: 50 });
  for (const order of response.result.items) {
    if (order.paid) await grantOrderCredits(userId, order);
  }
}

export async function handleOrderPaid(order: Order) {
  const userId = await findUserId(order.customer.externalId, order.customerId);
  if (!userId) {
    console.warn("[billing] Paid order for an unknown customer");
    return;
  }

  const minutes = await grantOrderCredits(userId, order);

  await sendLifecycleEmail(userId, "payment_succeeded", order.id, {
    productName: order.product?.name ?? "Meet.AI",
    voiceMinutes: minutes,
  });
}
