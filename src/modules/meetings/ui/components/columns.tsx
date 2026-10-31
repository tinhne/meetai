"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MeetingGetMany, MeetingStatus } from "../../types";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { ClockFadingIcon, CornerDownRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import humanizeDuration from "humanize-duration";

function formatDuration(secords: number) {
  return humanizeDuration(secords * 1000, {
    largest: 1,
    round: true,
    units: ["h", "m", "s"],
  });
}


export const columns: ColumnDef<MeetingGetMany[number]>[] = [
  {
    accessorKey: "name",
    header: "Meeting Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <span className="font-semibold capitalize">{row.original.name}</span>

        <div className="flex items-center gap-x-2">
          <div className="flex items-center gap-x-1">
            <CornerDownRightIcon className="size-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground max-w-50 truncate capitalize">
              {row.original.agent.name}
            </span>
          </div>
          <GeneratedAvatar
            variant="botttsNeutral"
            seed={row.original.agent.name}
            className="size-4"
          />
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt
              ? format(row.original.createdAt, "MMM d")
              : ""}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <MeetingStatusBadge status={row.original.status as MeetingStatus} />
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      return (
        <Badge
          variant="outline"
          className="capitalize [&>svg]:size-4 flex items-center gap-x-1"
        >
          <ClockFadingIcon className="text-info" />
          {row.original.duration
            ? formatDuration(row.original.duration)
            : "No duration"}
        </Badge>
      );
    },
  },
];
