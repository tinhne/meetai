"use client";

import { CalendarIcon, ClockFadingIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import type { MeetingInsights } from "@/server/ai/schemas";
import type { MeetingGetOne } from "../../types";
import { ActionItemsPanel } from "./action-items-panel";
import { AnalyticsPanel } from "./analytics-panel";
import { AskAiPanel } from "./ask-ai-panel";
import { formatDurationShort } from "./columns";
import { ScorecardPanel } from "@/modules/practice/ui/scorecard-panel";
import type { Scorecard } from "@/server/ai/schemas";
import { MeetingPlayerProvider } from "./meeting-player";
import { RecordingPlayer } from "./recording-player";
import { SummaryPanel } from "./summary-panel";
import { Transcript } from "./transcript";

interface Props {
  data: MeetingGetOne;
}

export const CompletedState = ({ data }: Props) => {
  const t = useTranslations("notes");
  const tPractice = useTranslations("practice");
  const format = useFormatter();
  const scorecard = data.scorecard as Scorecard | null;

  return (
    <MeetingPlayerProvider>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link
          href={`/dashboard/agents/${data.agent.id}`}
          className="flex items-center gap-2 hover:text-foreground"
        >
          <GeneratedAvatar variant="botttsNeutral" seed={data.agent.name} className="size-5" />
          {data.agent.name}
        </Link>
        {data.startedAt && (
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden />
            {format.dateTime(new Date(data.startedAt), { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
        {data.duration ? (
          <span className="flex items-center gap-1.5">
            <ClockFadingIcon className="size-4 text-info" aria-hidden />
            {formatDurationShort(data.duration)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <RecordingPlayer meetingId={data.id} />
          <Transcript meetingid={data.id} />
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <Tabs defaultValue={scorecard ? "scorecard" : "summary"} className="gap-3">
            <TabsList className="w-full">
              {scorecard && <TabsTrigger value="scorecard">{tPractice("scorecard.tab")}</TabsTrigger>}
              <TabsTrigger value="summary">{t("tabs.summary")}</TabsTrigger>
              <TabsTrigger value="actions">{t("tabs.actionItems")}</TabsTrigger>
              <TabsTrigger value="ask">{t("tabs.askAi")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
            </TabsList>
            {scorecard && (
              <TabsContent value="scorecard" className="lg:max-h-[calc(100svh-10rem)] lg:overflow-y-auto">
                <ScorecardPanel scorecard={scorecard} />
              </TabsContent>
            )}
            <TabsContent value="summary" className="lg:max-h-[calc(100svh-10rem)] lg:overflow-y-auto">
              <SummaryPanel
                insights={data.insights as MeetingInsights | null}
                summary={data.summary}
              />
            </TabsContent>
            <TabsContent value="actions">
              <ActionItemsPanel meetingId={data.id} />
            </TabsContent>
            <TabsContent value="ask">
              <AskAiPanel meetingId={data.id} />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsPanel meetingId={data.id} language={data.language} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MeetingPlayerProvider>
  );
};
