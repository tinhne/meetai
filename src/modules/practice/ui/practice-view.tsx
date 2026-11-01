"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PlayIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { PRACTICE_SCENARIOS, type PracticeKind } from "@/config/practice";
import { Link, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { TemplateIcon } from "@/modules/agents/ui/components/template-icon";
import { getQuotaInfo } from "@/modules/billing/lib/quota-dialog";
import { useTRPC } from "@/trpc/client";

const KINDS: PracticeKind[] = ["ielts", "interview", "sales"];

// Progress is plotted as a percentage so bands (/9) and scores (/10) share an axis.
const chartConfig = {
  ielts: { label: "IELTS", color: "var(--chart-1)" },
  interview: { label: "Interview", color: "var(--chart-2)" },
  sales: { label: "Sales", color: "var(--chart-3)" },
} satisfies ChartConfig;

export const PracticeView = () => {
  const t = useTranslations("practice");
  const format = useFormatter();
  const locale = useLocale() === "en" ? "en" : "vi";
  const trpc = useTRPC();
  const router = useRouter();

  const history = useQuery(trpc.practice.history.queryOptions());
  const start = useMutation(
    trpc.practice.start.mutationOptions({
      onSuccess: (meeting) => router.push(`/call/${meeting.id}`),
      onError: (error) => {
        if (!getQuotaInfo(error)) toast.error(error.message);
      },
    }),
  );

  const scored = (history.data ?? [])
    .filter((session) => session.overall !== null && session.kind)
    .slice()
    .reverse()
    .map((session) => ({
      date: format.dateTime(new Date(session.startedAt ?? session.createdAt), { day: "numeric", month: "short" }),
      [session.kind as PracticeKind]: Math.round(((session.overall ?? 0) / (session.scale === "band9" ? 9 : 10)) * 100),
    }));

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <PageHeader title={t("title")} description={t("description")} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("scenarios")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRACTICE_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TemplateIcon icon={scenario.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{scenario.name[locale]}</h3>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary">{t(`kinds.${scenario.kind}`)}</Badge>
                    <Badge variant="outline">{t(`language.${scenario.language}`)}</Badge>
                  </div>
                </div>
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{scenario.description[locale]}</p>
              <Button
                className="self-start"
                disabled={start.isPending}
                onClick={() => {
                  track("practice_started", { scenario: scenario.id });
                  start.mutate({ scenarioId: scenario.id, locale });
                }}
              >
                <PlayIcon />
                {start.isPending && start.variables?.scenarioId === scenario.id ? t("starting") : t("start")}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
      </section>

      {scored.length >= 2 && (
        <section className="flex flex-col gap-2 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">{t("progressTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("progressHint")}</p>
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <LineChart data={scored} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              {KINDS.map((kind) => (
                <Line
                  key={kind}
                  dataKey={kind}
                  name={t(`kinds.${kind}`)}
                  stroke={`var(--color-${kind})`}
                  strokeWidth={2}
                  connectNulls
                  dot
                />
              ))}
            </LineChart>
          </ChartContainer>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("historyTitle")}</h2>
        {history.isPending ? (
          <Skeleton className="h-32" />
        ) : !history.data?.length ? (
          <EmptyState title={t("historyEmpty")} description={t("historyEmptyDescription")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.data.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/dashboard/meetings/${session.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format.dateTime(new Date(session.startedAt ?? session.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {session.overall !== null && session.scale ? (
                    <span className="text-lg font-bold tabular-nums text-primary">
                      {session.overall}
                      <span className="text-sm font-normal text-muted-foreground">{t(`outOf.${session.scale}`)}</span>
                    </span>
                  ) : session.status === "processing" ? (
                    <StatusBadge tone="ai">{t("scoring")}</StatusBadge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("notScored")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
