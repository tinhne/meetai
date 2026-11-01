"use client";

import { ArrowRightIcon, CheckCircle2Icon, InfoIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Progress } from "@/components/ui/progress";
import type { Scorecard } from "@/server/ai/schemas";

export const ScorecardPanel = ({ scorecard }: { scorecard: Scorecard }) => {
  const t = useTranslations("practice");
  const max = scorecard.scale === "band9" ? 9 : 10;

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div className="flex items-end gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("scorecard.overall")}</p>
          <p className="text-4xl font-bold tabular-nums text-primary">
            {scorecard.overall}
            <span className="text-lg text-muted-foreground">{t(`outOf.${scorecard.scale}`)}</span>
          </p>
        </div>
        <p className="flex-1 text-sm leading-relaxed">{scorecard.summary}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t("scorecard.criteria")}</h3>
        {scorecard.criteria.map((criterion) => (
          <div key={criterion.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{criterion.name}</span>
              <span className="tabular-nums">
                {criterion.score}/{max}
              </span>
            </div>
            <Progress value={(criterion.score / max) * 100} aria-label={criterion.name} />
            <p className="text-xs text-muted-foreground">{criterion.comment}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("scorecard.strengths")}</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {scorecard.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("scorecard.improvements")}</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {scorecard.improvements.map((item) => (
              <li key={item} className="flex gap-2">
                <TrendingUpIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {scorecard.betterAnswers.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("scorecard.betterAnswers")}</h3>
          {scorecard.betterAnswers.map((answer) => (
            <div key={answer.question} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">{answer.question}</p>
              <p className="text-muted-foreground">
                <span className="font-medium">{t("scorecard.you")}: </span>
                {answer.original}
              </p>
              <p className="flex gap-1.5">
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium">{t("scorecard.better")}: </span>
                  {answer.improved}
                </span>
              </p>
            </div>
          ))}
        </section>
      )}

      <p className="flex gap-2 text-xs text-muted-foreground">
        <InfoIcon className="size-4 shrink-0" aria-hidden />
        {t("disclaimer")}
      </p>
    </div>
  );
};
