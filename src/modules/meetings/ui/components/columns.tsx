"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CalendarIcon, ClockFadingIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { MeetingGetMany, MeetingStatus } from "../../types";
import { MeetingStatusBadge } from "./meeting-status-badge";

export function formatDurationShort(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const useMeetingColumns = () => {
  const t = useTranslations("meetings.columns");
  const format = useFormatter();

  return useMemo<ColumnDef<MeetingGetMany[number]>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => {
          const meeting = row.original;
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-semibold">{meeting.name}</span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GeneratedAvatar
                    variant="botttsNeutral"
                    seed={meeting.agent.name}
                    className="size-4"
                  />
                  {meeting.agent.name}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  {meeting.scheduledAt && meeting.status === "upcoming"
                    ? t("scheduled", {
                        date: format.dateTime(new Date(meeting.scheduledAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      })
                    : format.dateTime(new Date(meeting.createdAt), { dateStyle: "medium" })}
                </span>
              </div>
              {meeting.tldr && (
                <p className="line-clamp-1 max-w-xl text-sm text-muted-foreground">
                  {meeting.tldr}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => (
          <MeetingStatusBadge status={row.original.status as MeetingStatus} />
        ),
      },
      {
        accessorKey: "duration",
        header: t("duration"),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockFadingIcon className="size-4 text-info" aria-hidden />
            {row.original.duration
              ? formatDurationShort(row.original.duration)
              : t("noDuration")}
          </span>
        ),
      },
    ],
    [t, format],
  );
};
