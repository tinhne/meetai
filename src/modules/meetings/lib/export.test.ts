import { describe, expect, it } from "vitest";

import { buildMeetingMarkdown, slugifyFileName } from "./export";

const labels = {
  tldr: "TL;DR",
  decisions: "Decisions",
  actionItems: "Action items",
  openQuestions: "Open questions",
  notes: "Notes",
  transcript: "Transcript",
};

describe("buildMeetingMarkdown", () => {
  it("includes the structured sections, checklists and transcript", () => {
    const markdown = buildMeetingMarkdown({
      name: "Họp chốt giá",
      date: "1/11/2026",
      agentName: "Mia",
      insights: {
        title: "x",
        tldr: "Chốt giá 149k.",
        chapters: [],
        decisions: [{ text: "Giá Pro 149k", sourceSec: 65 }],
        actionItems: [],
        openQuestions: [],
        sentiment: "positive",
        keyTerms: [],
        summaryMarkdown: "### Biên bản",
      },
      summary: "### Biên bản",
      actionItems: [
        { text: "Cập nhật bảng giá", owner: "Nam", dueDate: "Thứ Sáu", status: "open" },
        { text: "Gửi email", owner: null, dueDate: null, status: "done" },
      ],
      transcript: [{ speakerName: "Lan", startMs: 0, text: "Chào mọi người" }],
      labels,
    });

    expect(markdown).toContain("# Họp chốt giá");
    expect(markdown).toContain("- Giá Pro 149k [1:05]");
    expect(markdown).toContain("- [ ] Cập nhật bảng giá (Nam, Thứ Sáu)");
    expect(markdown).toContain("- [x] Gửi email");
    expect(markdown).toContain("**[0:00] Lan:** Chào mọi người");
  });
});

describe("slugifyFileName", () => {
  it("makes safe ASCII file names from Vietnamese titles", () => {
    expect(slugifyFileName("Họp Đội ngũ: Q4 / 2026")).toBe("hop-doi-ngu-q4-2026");
    expect(slugifyFileName("???")).toBe("meeting");
  });
});
