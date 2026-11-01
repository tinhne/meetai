import { describe, expect, it } from "vitest";

import {
  chunkBySize,
  formatTranscriptForPrompt,
  normalizeForSearch,
  selectRelevantSegments,
  streamLinesToSegments,
  windowsForDuration,
} from "./transcript";

describe("streamLinesToSegments", () => {
  it("sorts by time, maps speaker names and keeps positions", () => {
    const segments = streamLinesToSegments(
      [
        { speaker_id: "b", text: "second", start_ts: 2000, end_ts: 3000, type: "speech" },
        { speaker_id: "a", text: " first ", start_ts: 0, end_ts: 1500, type: "speech" },
      ],
      new Map([["a", "Lan"]]),
      "Unknown",
    );

    expect(segments.map((segment) => [segment.position, segment.speakerName, segment.text])).toEqual([
      [0, "Lan", "first"],
      [1, "Unknown", "second"],
    ]);
  });
});

describe("formatTranscriptForPrompt", () => {
  it("uses the compact [m:ss] Name: text format and skips empty lines", () => {
    expect(
      formatTranscriptForPrompt([
        { speakerName: "Lan", startMs: 65_000, text: "Xin chào" },
        { speakerName: "Mia", startMs: 70_000, text: "  " },
      ]),
    ).toBe("[1:05] Lan: Xin chào");
  });
});

describe("windowsForDuration", () => {
  it("splits the recording into fixed windows", () => {
    expect(windowsForDuration(25 * 60_000, 10 * 60_000)).toEqual([
      { startMs: 0, endMs: 600_000 },
      { startMs: 600_000, endMs: 1_200_000 },
      { startMs: 1_200_000, endMs: 1_500_000 },
    ]);
  });
});

describe("chunkBySize", () => {
  it("chunks arrays", () => {
    expect(chunkBySize([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("normalizeForSearch", () => {
  it("strips Vietnamese diacritics", () => {
    expect(normalizeForSearch("Cuộc họp ĐỊNH giá")).toBe("cuoc hop dinh gia");
  });
});

describe("selectRelevantSegments", () => {
  const segments = [
    { text: "Chào mọi người" },
    { text: "Hôm nay bàn về giá sản phẩm" },
    { text: "Giá đề xuất là 149 nghìn" },
    { text: "Chuyển sang phần marketing" },
    { text: "Kênh TikTok hiệu quả nhất" },
  ];

  it("returns matching segments with neighbours, in order", () => {
    expect(selectRelevantSegments(segments, "giá bao nhiêu?", 10)).toEqual([
      segments[0],
      segments[1],
      segments[2],
      segments[3],
    ]);
  });

  it("stops once the segment budget is reached", () => {
    expect(selectRelevantSegments(segments, "giá bao nhiêu?", 3)).toHaveLength(3);
  });

  it("falls back to the start when nothing matches", () => {
    expect(selectRelevantSegments(segments, "?", 2)).toEqual(segments.slice(0, 2));
  });
});
