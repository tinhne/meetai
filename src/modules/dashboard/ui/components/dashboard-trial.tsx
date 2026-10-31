"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { RocketIcon } from "lucide-react";
import Link from "next/link";

const UsageRow = ({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) => (
  <div className="flex flex-col gap-y-2">
    <p className="text-xs">
      {limit === null ? `${used} ${label}` : `${used}/${limit} ${label}`}
    </p>
    {limit !== null && (
      <Progress value={Math.min(100, (used / Math.max(1, limit)) * 100)} />
    )}
  </div>
);

export const DashboardTrial = () => {
  const trpc = useTRPC();

  const { data } = useQuery(trpc.premium.getFreeUsage.queryOptions());

  if (!data) return null;

  return (
    <div className="border border-border/10 rounded-lg w-full bg-white/5 flex flex-col gap-y-2">
      <div className="p-3 flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <RocketIcon className="size-4" />
          <p className="text-sm font-medium">Free plan</p>
        </div>
        <UsageRow label="Agents" used={data.agentCount} limit={data.agentLimit} />
        <UsageRow
          label="Meetings this month"
          used={data.meetingCount}
          limit={data.meetingLimit}
        />
      </div>
      <Button
        className="bg-transparent border-t border-border/10 hover:bg-white/10 rounded-t-none"
        asChild
      >
        <Link href="/dashboard/upgrade">Upgrade</Link>
      </Button>
    </div>
  );
};
