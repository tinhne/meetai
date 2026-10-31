"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { computeMeetingAnalytics } from "../../lib/analytics";

const BAR_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

export const AnalyticsPanel = ({ meetingId, language }: { meetingId: string; language: string }) => {
  const t = useTranslations("notes");
  const trpc = useTRPC();
  const { data, isPending } = useQuery(
    trpc.meetings.getTranscription.queryOptions({ id: meetingId }),
  );

  const stats = useMemo(
    () =>
      computeMeetingAnalytics(
        (data ?? []).map((item) => ({
          speakerName: item.user?.name ?? "Unknown",
          startMs: item.start_ts,
          endMs: item.end_ts,
          text: item.text ?? "",
        })),
        language,
      ),
    [data, language],
  );

  if (isPending) return <Skeleton className="h-48 w-full rounded-xl" />;

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-4 py-10 text-center">
        <BarChart3Icon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("analyticsEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold">{t("analyticsTitle")}</h3>
      <ul className="flex flex-col gap-4">
        {stats.map((speaker, index) => (
          <li key={speaker.name} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{speaker.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {t("talkTime", {
                  minutes: (speaker.talkMs / 60_000).toFixed(1),
                  percent: Math.round(speaker.share * 100),
                })}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                style={{ width: `${Math.max(2, speaker.share * 100)}%` }}
              />
            </div>
            <dl className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
              {(["words", "turns", "questions", "fillers"] as const).map((key) => (
                <div key={key} className="flex flex-col">
                  <dt>{t(key)}</dt>
                  <dd className="font-medium tabular-nums text-foreground">{speaker[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
};
