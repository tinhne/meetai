import { describe, expect, it } from "vitest";

import { computeMeetingAnalytics, parseTimestamp } from "./analytics";

describe("computeMeetingAnalytics", () => {
  const segments = [
    { speakerName: "Lan", startMs: 0, endMs: 6000, text: "Ờ, hôm nay mình chốt giá nhé?" },
    { speakerName: "Lan", startMs: 6000, endMs: 9000, text: "Kiểu như 149 nghìn." },
    { speakerName: "Nam", startMs: 9000, endMs: 12_000, text: "Đồng ý." },
    { speakerName: "Lan", startMs: 12_000, endMs: 13_000, text: "  " },
  ];

  it("aggregates talk time, turns, questions and filler words per speaker", () => {
    const [lan, nam] = computeMeetingAnalytics(segments, "vi");

    expect(lan).toMatchObject({ name: "Lan", talkMs: 9000, turns: 1, questions: 1, fillers: 2 });
    expect(nam).toMatchObject({ name: "Nam", talkMs: 3000, turns: 1, fillers: 0 });
    expect(lan.share).toBeCloseTo(0.75);
  });

  it("does not count fillers inside other words", () => {
    const [stats] = computeMeetingAnalytics(
      [{ speakerName: "A", startMs: 0, endMs: 1000, text: "Anh ấy là người likeable" }],
      "en",
    );
    expect(stats.fillers).toBe(0);
  });
});

describe("parseTimestamp", () => {
  it("parses m:ss and h:mm:ss", () => {
    expect(parseTimestamp("1:05")).toBe(65_000);
    expect(parseTimestamp("1:02:03")).toBe(3_723_000);
    expect(parseTimestamp("x:1")).toBeNull();
  });
});
