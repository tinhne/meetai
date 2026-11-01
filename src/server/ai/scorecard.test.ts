import { describe, expect, it } from "vitest";

import { PRACTICE_SCENARIOS } from "../../config/practice";
import { AGENT_TEMPLATES } from "../../config/agent-templates";
import { scorecardSchema } from "./schemas";

describe("scorecardSchema", () => {
  it("accepts an IELTS estimate", () => {
    const card = scorecardSchema.parse({
      scale: "band9",
      overall: 6.5,
      criteria: [
        { name: "Fluency and Coherence", score: 6.5, comment: "Ổn" },
        { name: "Lexical Resource", score: 6, comment: "Ổn" },
        { name: "Grammatical Range and Accuracy", score: 6.5, comment: "Ổn" },
        { name: "Pronunciation", score: 7, comment: "Ước lượng" },
      ],
      strengths: ["Trả lời đủ ý"],
      improvements: ["Dùng thêm từ nối"],
      betterAnswers: [],
      summary: "Khá tốt",
    });
    expect(card.overall).toBe(6.5);
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      scorecardSchema.parse({
        scale: "ten",
        overall: 11,
        criteria: [],
        strengths: [],
        improvements: [],
        betterAnswers: [],
        summary: "",
      }),
    ).toThrow();
  });
});

describe("practice scenarios", () => {
  it("point at existing agent templates and have unique ids", () => {
    const templateIds = new Set(AGENT_TEMPLATES.map((template) => template.id));
    for (const scenario of PRACTICE_SCENARIOS) expect(templateIds.has(scenario.templateId)).toBe(true);
    expect(new Set(PRACTICE_SCENARIOS.map((scenario) => scenario.id)).size).toBe(PRACTICE_SCENARIOS.length);
  });
});
