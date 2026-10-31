import { describe, expect, it } from "vitest";

import { chunkText, chunkTranscript, cosineSimilarity } from "./chunking";

describe("chunkTranscript", () => {
  const lines = [
    { startMs: 0, endMs: 2_000, speakerName: "Lan", text: "Chào mọi người" },
    { startMs: 2_000, endMs: 4_000, speakerName: "Nam", text: "  " },
    { startMs: 4_000, endMs: 9_000, speakerName: "Nam", text: "Giá Pro là 149 nghìn" },
    { startMs: 9_000, endMs: 12_000, speakerName: "Hà", text: "Đồng ý" },
  ];

  it("keeps speakers and time ranges", () => {
    const [chunk] = chunkTranscript(lines, 1_000);
    expect(chunk).toEqual({
      startMs: 0,
      endMs: 12_000,
      content: "Lan: Chào mọi người\nNam: Giá Pro là 149 nghìn\nHà: Đồng ý",
    });
  });

  it("starts a new window when the size is reached", () => {
    const chunks = chunkTranscript(lines, 30);
    expect(chunks.map((chunk) => chunk.startMs)).toEqual([0, 4_000, 9_000]);
  });
});

describe("chunkText", () => {
  it("returns short text as one chunk", () => {
    expect(chunkText("Xin chào", 100, 10)).toEqual(["Xin chào"]);
    expect(chunkText("   ", 100, 10)).toEqual([]);
  });

  it("splits long text under the size with overlap", () => {
    const paragraph = "Câu một dài vừa phải. ".repeat(40);
    const chunks = chunkText(`${paragraph}\n\n${paragraph}`, 300, 50);
    expect(chunks.length).toBeGreaterThan(2);
    expect(Math.max(...chunks.map((chunk) => chunk.length))).toBeLessThanOrEqual(360);
  });

  it("hard-splits text without sentence breaks", () => {
    const chunks = chunkText("x".repeat(1_000), 300, 0);
    expect(chunks.every((chunk) => chunk.length <= 300)).toBe(true);
    expect(chunks.join("").replace(/\n/g, "").length).toBe(1_000);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical direction and 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
