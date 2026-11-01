"use client";

import { CheckCircle2Icon, ListTodoIcon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_MEETING } from "@/content/demo-meeting";
import { cn, formatTimestamp } from "@/lib/utils";
import { SectionHeading } from "./landing-sections";

// Static, client-only demo of the notes page: no sign-up or API needed.
export const InteractiveDemo = () => {
  const t = useTranslations("landing.demo");
  const tNotes = useTranslations("notes");
  const locale = useLocale() === "en" ? "en" : "vi";
  const demo = DEMO_MEETING[locale];
  const [active, setActive] = useState<number[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);

  const jumpTo = (sec: number) => {
    const index = demo.transcript.findIndex((line) => line.sec === sec);
    if (index >= 0) setActive([index]);
  };

  return (
    <section id="demo" className="bg-muted/30 py-20 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4" aria-label={t("transcript")}>
            <p className="mb-2 px-2 text-sm font-semibold">
              {t("meetingName")} · {t("transcript")}
            </p>
            {demo.transcript.map((line, index) => (
              <button
                key={line.sec}
                type="button"
                onClick={() => setActive([index])}
                aria-pressed={active.includes(index)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg p-2.5 text-left text-sm transition-colors hover:bg-accent",
                  active.includes(index) && "bg-primary/10 ring-1 ring-primary/30",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("font-medium", line.speaker.includes("AI") && "text-ai")}>
                    {line.speaker}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{formatTimestamp(line.sec * 1000)}</span>
                </span>
                <span className="text-foreground/85">{line.text}</span>
              </button>
            ))}
          </div>

          <Tabs defaultValue="notes" className="gap-3">
            <TabsList className="w-full">
              <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
              <TabsTrigger value="ask">{t("ask")}</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="flex flex-col gap-4">
              <div className="rounded-xl border border-ai/20 bg-ai/5 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ai">
                  <SparklesIcon className="size-4" />
                  {tNotes("tldr")}
                </p>
                <p className="text-sm leading-relaxed">{demo.tldr}</p>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <CheckCircle2Icon className="size-4 text-success" />
                  {tNotes("decisions")}
                </p>
                {demo.decisions.map((decision) => (
                  <button
                    key={decision.text}
                    type="button"
                    onClick={() => jumpTo(decision.sec)}
                    className="flex items-start gap-2 text-left text-sm hover:text-primary"
                  >
                    <span className="font-mono text-xs text-primary">[{formatTimestamp(decision.sec * 1000)}]</span>
                    {decision.text}
                  </button>
                ))}
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                  <ListTodoIcon className="size-4 text-warning" />
                  {tNotes("tabs.actionItems")}
                </p>
                {demo.actionItems.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => jumpTo(item.sec)}
                    className="flex flex-col items-start text-left text-sm hover:text-primary"
                  >
                    <span>{item.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.owner} · {item.due}
                    </span>
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="ask" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("askHint")}</p>
              <div className="flex flex-col gap-2">
                {demo.questions.map((question) => (
                  <Button
                    key={question.question}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal py-2 text-left"
                    onClick={() => {
                      setAnswer(question.answer);
                      setActive(question.cites);
                    }}
                  >
                    {question.question}
                  </Button>
                ))}
              </div>
              {answer && (
                <p className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm leading-relaxed" aria-live="polite">
                  {answer}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
