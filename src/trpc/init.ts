import { auth } from "@/lib/auth";
import { assertQuota } from "@/server/billing/quota";
import { QuotaExceededError } from "@/server/billing/quota-rules";
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
  // Quota errors carry their context so the client can open the upgrade dialog.
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        quota: error.cause instanceof QuotaExceededError ? error.cause.info : null,
      },
    };
  },
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

// For pages usable both signed in and as a guest (meeting join links).
export const optionalAuthProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return next({ ctx: { ...ctx, session } });
});

// Creating meetings/agents checks the plan quota first (FORBIDDEN + quota info).
export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const plan = await assertQuota(
      ctx.auth.user.id,
      entity === "meetings" ? ["meetings", "recordingMinutes"] : ["agents"],
    );
    return next({ ctx: { ...ctx, plan } });
  });
