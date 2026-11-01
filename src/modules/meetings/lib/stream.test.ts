import { describe, expect, it } from "vitest";

import {
  countHumanParticipants,
  meetingIdFromCallCid,
  streamCallCid,
  toStreamTranscriptionLanguage,
} from "./stream";

describe("toStreamTranscriptionLanguage", () => {
  it("passes through languages Stream supports", () => {
    expect(toStreamTranscriptionLanguage("en")).toBe("en");
    expect(toStreamTranscriptionLanguage("auto")).toBe("auto");
  });

  it("falls back to auto for Vietnamese, which Stream STT does not support", () => {
    expect(toStreamTranscriptionLanguage("vi")).toBe("auto");
  });
});

describe("call cid helpers", () => {
  it("round-trips the meeting id", () => {
    expect(meetingIdFromCallCid(streamCallCid("meetai", "abc123"))).toBe("abc123");
  });

  it("returns null for malformed cids", () => {
    expect(meetingIdFromCallCid("default")).toBeNull();
  });
});

describe("countHumanParticipants", () => {
  it("ignores the AI agent", () => {
    expect(
      countHumanParticipants([{ user: { id: "agent-1" } }], ["agent-1"]),
    ).toBe(0);
  });

  it("counts each human once across multiple sessions", () => {
    expect(
      countHumanParticipants(
        [
          { user: { id: "user-a" } },
          { user: { id: "user-a" } },
          { user: { id: "agent-1" } },
          { user: { id: "user-b" } },
        ],
        ["agent-1"],
      ),
    ).toBe(2);
  });
});
