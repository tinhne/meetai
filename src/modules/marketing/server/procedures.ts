import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { marketingLeads } from "@/db/schema";
import { getClientIp } from "@/server/guest-session";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

export const marketingRouter = createTRPCRouter({
  submitLead: baseProcedure
    .input(
      z.object({
        kind: z.enum(["team_waitlist", "contact"]),
        email: z.email().max(200),
        name: z.string().trim().max(100).optional(),
        message: z.string().trim().max(2000).optional(),
        locale: z.enum(["vi", "en"]),
        // Honeypot: real people never fill this hidden field.
        website: z.string().max(0).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const limit = await consumeRateLimit(
        `marketingLead:${await getClientIp()}`,
        RATE_LIMITS.marketingLead,
      );
      if (!limit.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests" });
      }

      await db.insert(marketingLeads).values({
        kind: input.kind,
        email: input.email.toLowerCase(),
        name: input.name || null,
        message: input.message || null,
        locale: input.locale,
      });

      return { ok: true };
    }),
});
