import "server-only";

import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { appRateLimits } from "@/db/schema";

export interface RateLimitRule {
  limit: number;
  windowSec: number;
}

export const RATE_LIMITS = {
  streamToken: { limit: 30, windowSec: 60 },
  createMeeting: { limit: 10, windowSec: 60 },
  createAgent: { limit: 10, windowSec: 60 },
  meetingAction: { limit: 20, windowSec: 60 },
  joinRequest: { limit: 10, windowSec: 60 },
  askAgent: { limit: 6, windowSec: 60 },
  invite: { limit: 5, windowSec: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

// Fixed-window counter stored in Postgres (atomic upsert, no extra service).
export async function consumeRateLimit(key: string, rule: RateLimitRule) {
  const now = new Date();
  // Timestamp columns are stored as UTC ISO strings (see drizzle PgTimestamp).
  const nowSql = sql`${now.toISOString()}::timestamp`;
  const cutoffSql = sql`${new Date(
    now.getTime() - rule.windowSec * 1000,
  ).toISOString()}::timestamp`;
  const isExpired = sql`${appRateLimits.windowStart} <= ${cutoffSql}`;

  const [row] = await db
    .insert(appRateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: appRateLimits.key,
      set: {
        count: sql`CASE WHEN ${isExpired} THEN 1 ELSE ${appRateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${isExpired} THEN ${nowSql} ELSE ${appRateLimits.windowStart} END`,
      },
    })
    .returning({
      count: appRateLimits.count,
      windowStart: appRateLimits.windowStart,
    });

  const resetAt = row.windowStart.getTime() + rule.windowSec * 1000;

  return {
    allowed: row.count <= rule.limit,
    retryAfterSec: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

export async function enforceRateLimit(
  name: keyof typeof RATE_LIMITS,
  userId: string,
) {
  const result = await consumeRateLimit(`${name}:${userId}`, RATE_LIMITS[name]);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Please try again in ${result.retryAfterSec}s.`,
    });
  }
}
