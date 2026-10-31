// Plan + usage ledger shared by the web app and the agent worker, so it uses
// relative imports only and receives the database client as an argument.

import { and, desc, eq, gt, gte, inArray, isNull, or, sql, sum } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import {
  PAID_STATUSES,
  PLANS,
  splitVoiceUsage,
  startOfUtcMonth,
  type PlanLimits,
} from "../../config/plans";
import { credits, subscriptions, usageEvents } from "../../db/schema";

type Db = NeonHttpDatabase;
export type UsageKind = (typeof usageEvents.$inferInsert)["kind"];

export async function getActiveSubscription(db: Db, userId: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, [...PAID_STATUSES]),
        or(isNull(subscriptions.endsAt), gt(subscriptions.endsAt, now)),
      ),
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function resolvePlan(db: Db, userId: string): Promise<PlanLimits> {
  const subscription = await getActiveSubscription(db, userId);
  return subscription ? PLANS.pro : PLANS.free;
}

export async function getMonthlyUsage(db: Db, userId: string, kind: UsageKind) {
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

export async function getCreditSeconds(db: Db, userId: string) {
  const [row] = await db
    .select({ total: sum(credits.remaining) })
    .from(credits)
    .where(
      and(
        eq(credits.userId, userId),
        gt(credits.remaining, 0),
        or(isNull(credits.expiresAt), gt(credits.expiresAt, new Date())),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getVoiceAllowance(db: Db, userId: string, plan?: PlanLimits) {
  const [resolved, usedSeconds, creditSeconds] = await Promise.all([
    plan ?? resolvePlan(db, userId),
    getMonthlyUsage(db, userId, "ai_voice_seconds"),
    getCreditSeconds(db, userId),
  ]);
  const includedSeconds = resolved.aiVoiceMinutesPerMonth * 60;
  const planRemaining = Math.max(0, includedSeconds - usedSeconds);

  return {
    plan: resolved,
    includedSeconds,
    usedSeconds,
    creditSeconds,
    remainingSeconds: planRemaining + creditSeconds,
  };
}

// Spends prepaid seconds oldest first in one statement. LEAST() keeps
// `remaining` from going negative if two meetings spend at the same time.
async function spendCredits(db: Db, userId: string, seconds: number) {
  if (seconds <= 0) return;
  await db.execute(sql`
    WITH ordered AS (
      SELECT id,
             SUM(remaining) OVER (ORDER BY created_at, id) - remaining AS before
      FROM credits
      WHERE user_id = ${userId}
        AND remaining > 0
        AND (expires_at IS NULL OR expires_at > now())
    )
    UPDATE credits AS c
    SET remaining = c.remaining - LEAST(c.remaining, ${seconds} - o.before)
    FROM ordered AS o
    WHERE c.id = o.id AND o.before < ${seconds}
  `);
}

export async function recordVoiceUsage(
  db: Db,
  params: {
    userId: string;
    meetingId: string;
    voiceSeconds: number;
    inputTokens: number;
    outputTokens: number;
  },
) {
  const seconds = Math.ceil(params.voiceSeconds);
  if (seconds > 0) {
    const [plan, usedBefore] = await Promise.all([
      resolvePlan(db, params.userId),
      getMonthlyUsage(db, params.userId, "ai_voice_seconds"),
    ]);
    const { fromCredits } = splitVoiceUsage(plan.aiVoiceMinutesPerMonth * 60, usedBefore, seconds);
    await spendCredits(db, params.userId, fromCredits);
  }

  const rows: (typeof usageEvents.$inferInsert)[] = [
    { userId: params.userId, meetingId: params.meetingId, kind: "ai_voice_seconds", quantity: seconds },
    { userId: params.userId, meetingId: params.meetingId, kind: "realtime_input_tokens", quantity: params.inputTokens },
    { userId: params.userId, meetingId: params.meetingId, kind: "realtime_output_tokens", quantity: params.outputTokens },
  ];
  const nonEmpty = rows.filter((row) => (row.quantity ?? 0) > 0);
  if (nonEmpty.length > 0) await db.insert(usageEvents).values(nonEmpty);
}
