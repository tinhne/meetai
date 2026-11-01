"use client";

import { CheckCircle2Icon, HelpCircleIcon, ListTreeIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { MeetingInsights } from "@/server/ai/schemas";
import { NotesMarkdown } from "./notes-markdown";
import { TimestampButton } from "./timestamp-button";

interface Props {
  insights: MeetingInsights | null;
  summary: string | null;
}

const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

export const SummaryPanel = ({ insights, summary }: Props) => {
  const t = useTranslations("notes");

  if (!insights) {
    return (
      <div className="rounded-xl border bg-card p-5">
        {summary ? <NotesMarkdown>{summary}</NotesMarkdown> : (
          <p className="text-sm text-muted-foreground">{t("noInsights")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-ai/20 bg-ai/5 p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ai">
            <SparklesIcon className="size-4" />
            {t("tldr")}
          </h3>
          <Badge variant="outline">{t(`sentiment.${insights.sentiment}`)}</Badge>
        </div>
        <p className="leading-relaxed">{insights.tldr}</p>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border bg-card p-5">
        {insights.chapters.length > 0 && (
          <Section icon={<ListTreeIcon className="size-4 text-primary" />} title={t("chapters")}>
            <ol className="flex flex-col gap-3">
              {insights.chapters.map((chapter, index) => (
                <li key={`${chapter.startSec}-${index}`} className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 font-medium">
                    <TimestampButton ms={chapter.startSec * 1000} />
                    {chapter.title}
                  </span>
                  <ul className="list-disc space-y-0.5 pl-9 text-sm text-foreground/85">
                    {chapter.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {insights.decisions.length > 0 && (
          <Section icon={<CheckCircle2Icon className="size-4 text-success" />} title={t("decisions")}>
            <ul className="flex flex-col gap-2 text-sm">
              {insights.decisions.map((decision, index) => (
                <li key={index} className="flex items-start gap-1">
                  {decision.sourceSec !== null && <TimestampButton ms={decision.sourceSec * 1000} />}
                  <span>{decision.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {insights.openQuestions.length > 0 && (
          <Section icon={<HelpCircleIcon className="size-4 text-warning" />} title={t("openQuestions")}>
            <ul className="flex flex-col gap-2 text-sm">
              {insights.openQuestions.map((question, index) => (
                <li key={index} className="flex items-start gap-1">
                  {question.sourceSec !== null && <TimestampButton ms={question.sourceSec * 1000} />}
                  <span>{question.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {summary && (
        <details className="group rounded-xl border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">{t("fullNotes")}</summary>
          <div className="mt-4">
            <NotesMarkdown>{summary}</NotesMarkdown>
          </div>
        </details>
      )}
    </div>
  );
};
