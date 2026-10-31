import { agentsRouter } from "@/modules/agents/server/procedures";
import { createTRPCRouter } from "../init";
import { meetingsRouter } from "@/modules/meetings/server/procedures";
import { billingRouter } from "@/modules/billing/server/procedures";
import { joinRouter } from "@/modules/join/server/procedures";
import { shareRouter } from "@/modules/share/server/procedures";
import { dashboardRouter } from "@/modules/dashboard/server/procedures";
import { settingsRouter } from "@/modules/settings/server/procedures";
import { marketingRouter } from "@/modules/marketing/server/procedures";
export const appRouter = createTRPCRouter({
  agents: agentsRouter,
  meetings: meetingsRouter,
  billing: billingRouter,
  join: joinRouter,
  share: shareRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  marketing: marketingRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
