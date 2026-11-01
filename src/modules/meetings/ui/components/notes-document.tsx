import { useTranslations } from "next-intl";

import { formatTimestamp } from "@/lib/utils";
import type { MeetingInsights } from "@/server/ai/schemas";
import { NotesMarkdown } from "./notes-markdown";

interface Props {
  name: string;
  dateLabel: string | null;
  agentName: string;
  insights: MeetingInsights | null;
  summary: string | null;
  actionItems?: { id: string; text: string; owner: string | null; dueDate: string | null; status: string }[];
  transcript: { speakerName: string; startMs: number; text: string }[];
}

const stamp = (sec: number | null) =>
  sec === null ? null : (
    <span className="mr-1 font-mono text-xs text-muted-foreground">[{formatTimestamp(sec * 1000)}]</span>
  );

// Read-only meeting notes (share page and print view).
export const NotesDocument = ({
  name,
  dateLabel,
  agentName,
  insights,
  summary,
  actionItems,
  transcript,
}: Props) => {
  const t = useTranslations("notes");

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground">
          {[dateLabel, `${t("agentLabel")}: ${agentName}`].filter(Boolean).join(" · ")}
        </p>
      </header>

      {insights && (
        <section className="rounded-xl border border-ai/20 bg-ai/5 p-5 print:border-border print:bg-transparent">
          <h2 className="mb-2 text-sm font-semibold text-ai">{t("tldr")}</h2>
          <p className="leading-relaxed">{insights.tldr}</p>
        </section>
      )}

      {insights && insights.decisions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("decisions")}</h2>
          <ul className="list-disc space-y-1 pl-5">
            {insights.decisions.map((decision, index) => (
              <li key={index}>
                {stamp(decision.sourceSec)}
                {decision.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {actionItems && actionItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("tabs.actionItems")}</h2>
          <ul className="space-y-1">
            {actionItems.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span aria-hidden>{item.status === "done" ? "☑" : "☐"}</span>
                <span>
                  {item.text}
                  {(item.owner || item.dueDate) && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({[item.owner, item.dueDate].filter(Boolean).join(", ")})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights && insights.openQuestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("openQuestions")}</h2>
          <ul className="list-disc space-y-1 pl-5">
            {insights.openQuestions.map((question, index) => (
              <li key={index}>
                {stamp(question.sourceSec)}
                {question.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("fullNotes")}</h2>
          <NotesMarkdown>{summary}</NotesMarkdown>
        </section>
      )}

      {transcript.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("tabs.transcript")}</h2>
          <div className="flex flex-col gap-3">
            {transcript.map((line, index) => (
              <p key={index} className="text-sm leading-relaxed">
                <span className="font-mono text-xs text-muted-foreground">
                  [{formatTimestamp(line.startMs)}]
                </span>{" "}
                <span className="font-semibold">{line.speakerName}:</span> {line.text}
              </p>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
