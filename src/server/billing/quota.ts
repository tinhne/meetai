import "server-only";

import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, sql } from "drizzle-orm";

import { monthKey, QUOTA_WARNING_RATIO, startOfUtcMonth, type PlanLimits } from "@/config/plans";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { sendLifecycleEmail } from "./lifecycle-emails";
import { getMonthlyUsage, getVoiceAllowance } from "./ledger";
import { getUserPlan } from "./plan";
import {
  evaluateQuota,
  QuotaExceededError,
  usageRatio,
  type QuotaInfo,
  type QuotaKind,
} from "./quota-rules";

export async function getAgentCount(userId: string) {
  const [row] = await db.select({ count: count(agents.id) }).from(agents).where(eq(agents.userId, userId));
  return row?.count ?? 0;
}

// Minutes of meetings started this month (live meetings count up to now).
export async function getRecordedMinutes(userId: string) {
  const [row] = await db
    .select({
      seconds: sql<string | null>`sum(extract(epoch from (coalesce(${meetings.endedAt}, now()) - ${meetings.startedAt})))`,
    })
    .from(meetings)
    .where(and(eq(meetings.userId, userId), gte(meetings.startedAt, startOfUtcMonth())));
  return Math.ceil(Number(row?.seconds ?? 0) / 60);
}

async function measure(userId: string, kind: QuotaKind, plan: PlanLimits): Promise<Omit<QuotaInfo, "allowed">> {
  const base = { kind, planId: plan.id };
  switch (kind) {
    case "meetings":
      return { ...base, used: await getMonthlyUsage(db, userId, "meeting_created"), limit: plan.meetingsPerMonth };
    case "recordingMinutes":
      return { ...base, used: await getRecordedMinutes(userId), limit: plan.recordingMinutesPerMonth };
    case "agents":
      return { ...base, used: await getAgentCount(userId), limit: plan.maxAgents };
    case "aiVoice": {
      const voice = await getVoiceAllowance(db, userId, plan);
      // Credits extend the monthly allowance.
      return {
        ...base,
        used: Math.ceil(voice.usedSeconds / 60),
        limit: Math.floor((voice.includedSeconds + voice.creditSeconds) / 60),
      };
    }
    case "knowledgeDocuments":
      // Counted by the knowledge base module when it exists.
      return { ...base, used: 0, limit: plan.knowledgeDocuments };
  }
}

export async function checkQuota(userId: string, kind: QuotaKind, amount = 1, plan?: PlanLimits) {
  const resolved = plan ?? (await getUserPlan(userId));
  const measured = await measure(userId, kind, resolved);
  return { ...measured, allowed: evaluateQuota(measured.limit, measured.used, amount) } satisfies QuotaInfo;
}

// Throws FORBIDDEN with the quota context when any of the kinds is exhausted.
export async function assertQuota(userId: string, kinds: QuotaKind[], plan?: PlanLimits) {
  const resolved = plan ?? (await getUserPlan(userId));
  for (const kind of kinds) {
    const info = await checkQuota(userId, kind, 1, resolved);
    if (!info.allowed) {
      const cause = new QuotaExceededError(info);
      throw new TRPCError({ code: "FORBIDDEN", message: cause.message, cause });
    }
  }
  return resolved;
}

// Sends the 80% warning once per month per quota. Called after usage grows
// (meeting processed, meeting created); never throws.
export async function warnIfNearQuota(userId: string, kinds: ("aiVoice" | "meetings")[]) {
  try {
    const plan = await getUserPlan(userId);
    for (const kind of kinds) {
      const info = await checkQuota(userId, kind, 0, plan);
      if (info.limit === null || usageRatio(info.limit, info.used) < QUOTA_WARNING_RATIO) continue;
      await sendLifecycleEmail(userId, "quota_warning", `${kind}:${monthKey()}`, {
        quotaLabel: kind === "aiVoice" ? "phút AI nói" : "cuộc họp",
        used: info.used,
        limit: info.limit,
      });
    }
  } catch (error) {
    console.error("[billing] Quota warning failed:", error instanceof Error ? error.name : "unknown");
  }
}
