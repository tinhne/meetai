"use client";

import { useQuery } from "@tanstack/react-query";
import { RocketIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { UsageMeter } from "@/components/usage-meter";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { useTRPC } from "@/trpc/client";

// Free-plan usage in the sidebar; hidden on paid plans.
export const DashboardTrial = () => {
  const t = useTranslations("usage");
  const trpc = useTRPC();

  const { data } = useQuery(trpc.billing.getOverview.queryOptions());

  if (!data || data.plan.id !== "free") return null;
  const { usage } = data;

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 flex flex-col">
      <div className="p-3 flex flex-col gap-y-3">
        <div className="flex items-center gap-2">
          <RocketIcon className="size-4 text-sidebar-primary" />
          <p className="text-sm font-medium">{t("freePlan")}</p>
        </div>
        <UsageMeter label={t("agents")} used={usage.agents.used} limit={usage.agents.limit} />
        <UsageMeter
          label={t("meetingsThisMonth")}
          used={usage.meetings.used}
          limit={usage.meetings.limit}
        />
        <UsageMeter
          label={t("aiVoice")}
          used={usage.aiVoice.usedMinutes}
          limit={usage.aiVoice.includedMinutes + usage.aiVoice.creditMinutes}
        />
      </div>
      <Button
        asChild
        size="sm"
        className="m-3 mt-0 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
      >
        <Link href="/dashboard/billing" onClick={() => track("upgrade_clicked", { source: "sidebar" })}>
          {t("upgrade")}
        </Link>
      </Button>
    </div>
  );
};
