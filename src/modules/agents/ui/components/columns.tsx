"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MicIcon, VideoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { AgentGetMany } from "../../types";

export const useAgentColumns = () => {
  const t = useTranslations("agents.columns");

  return useMemo<ColumnDef<AgentGetMany[number]>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <GeneratedAvatar variant="botttsNeutral" seed={row.original.name} className="size-9 shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold">{row.original.name}</span>
              <span className="line-clamp-1 max-w-md text-sm text-muted-foreground">
                {row.original.instructions}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "voice",
        header: "",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
            <MicIcon className="size-4" aria-hidden />
            {row.original.voice}
          </span>
        ),
      },
      {
        accessorKey: "meetingCount",
        header: t("meetings"),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <VideoIcon className="size-4 text-info" aria-hidden />
            {t("meetingCount", { count: row.original.meetingCount })}
          </span>
        ),
      },
    ],
    [t],
  );
};
