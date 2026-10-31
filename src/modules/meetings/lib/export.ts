// Builds a portable Markdown document of a meeting's notes.

import { formatTimestamp } from "@/lib/utils";
import type { MeetingInsights } from "@/server/ai/schemas";

export interface MeetingExport {
  name: string;
  date: string | null;
  agentName: string;
  insights: MeetingInsights | null;
  summary: string | null;
  actionItems: { text: string; owner: string | null; dueDate: string | null; status: string }[];
  transcript: { speakerName: string; startMs: number; text: string }[];
  labels: {
    tldr: string;
    decisions: string;
    actionItems: string;
    openQuestions: string;
    notes: string;
    transcript: string;
  };
}

const at = (sec: number | null) => (sec === null ? "" : ` [${formatTimestamp(sec * 1000)}]`);

export function buildMeetingMarkdown(data: MeetingExport) {
  const lines: string[] = [`# ${data.name}`, ""];
  const meta = [data.date, data.agentName].filter(Boolean).join(" · ");
  if (meta) lines.push(`_${meta}_`, "");

  if (data.insights) {
    lines.push(`## ${data.labels.tldr}`, "", data.insights.tldr, "");
    if (data.insights.decisions.length > 0) {
      lines.push(`## ${data.labels.decisions}`, "");
      for (const decision of data.insights.decisions) {
        lines.push(`- ${decision.text}${at(decision.sourceSec)}`);
      }
      lines.push("");
    }
  }

  if (data.actionItems.length > 0) {
    lines.push(`## ${data.labels.actionItems}`, "");
    for (const item of data.actionItems) {
      const extra = [item.owner, item.dueDate].filter(Boolean).join(", ");
      lines.push(`- [${item.status === "done" ? "x" : " "}] ${item.text}${extra ? ` (${extra})` : ""}`);
    }
    lines.push("");
  }

  if (data.insights && data.insights.openQuestions.length > 0) {
    lines.push(`## ${data.labels.openQuestions}`, "");
    for (const question of data.insights.openQuestions) {
      lines.push(`- ${question.text}${at(question.sourceSec)}`);
    }
    lines.push("");
  }

  if (data.summary) lines.push(`## ${data.labels.notes}`, "", data.summary.trim(), "");

  if (data.transcript.length > 0) {
    lines.push(`## ${data.labels.transcript}`, "");
    for (const line of data.transcript) {
      lines.push(`**[${formatTimestamp(line.startMs)}] ${line.speakerName}:** ${line.text}`, "");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

export function slugifyFileName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "meeting"
  );
}
