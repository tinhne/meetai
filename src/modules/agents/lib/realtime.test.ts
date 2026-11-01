import { describe, expect, it } from "vitest";

import {
  buildRealtimeSessionConfig,
  effectiveAiMode,
  isAgentAddressed,
  readAgentControl,
  voiceSecondsFromUsage,
} from "./realtime";
import { signWorkerRequest, verifyWorkerRequest } from "./worker-auth";

const context = {
  mode: "conversational" as const,
  agentName: "Mia",
  agentInstructions: "You are a friendly interviewer.",
  voice: "alloy",
  meetingName: "Mock interview",
  agenda: null,
  language: "vi",
};

describe("buildRealtimeSessionConfig", () => {
  it("locks the language and keeps the owner's persona", () => {
    const config = buildRealtimeSessionConfig(context);
    expect(config.instructions).toContain("Vietnamese");
    expect(config.instructions).toContain("You are a friendly interviewer.");
    expect(config.instructions).not.toContain("Agenda:");
  });

  it("uses semantic VAD, noise reduction and a token cap", () => {
    const config = buildRealtimeSessionConfig(context);
    expect(config.turn_detection.type).toBe("semantic_vad");
    expect(config.input_audio_noise_reduction.type).toBe("near_field");
    expect(config.max_response_output_tokens).toBeGreaterThan(0);
  });
});

describe("group modes", () => {
  it("never answers on its own and transcribes input to detect its name", () => {
    const config = buildRealtimeSessionConfig({ ...context, mode: "on_demand" });
    expect(config.turn_detection.create_response).toBe(false);
    expect(config.input_audio_transcription).toMatchObject({ language: "vi" });
    expect(config.instructions).toContain("group meeting");
  });

  it("answers naturally in conversational mode", () => {
    const config = buildRealtimeSessionConfig(context);
    expect(config.turn_detection.create_response).toBe(true);
    expect(config.input_audio_transcription).toBeNull();
  });
});

describe("isAgentAddressed", () => {
  it("matches the name regardless of accents and case", () => {
    expect(isAgentAddressed("Mia ơi, giá chốt bao nhiêu?", "Mia")).toBe(true);
    expect(isAgentAddressed("hey MIA what's next", "Mia")).toBe(true);
    expect(isAgentAddressed("chị Hà ơi", "Hà")).toBe(true);
    expect(isAgentAddressed("Trợ lý An", "Trợ Lý An")).toBe(true);
  });

  it("does not match inside other words", () => {
    expect(isAgentAddressed("chúng ta làm media", "Mia")).toBe(false);
    expect(isAgentAddressed("Tran bao", "An")).toBe(false);
  });
});

describe("voiceSecondsFromUsage", () => {
  it("converts output audio tokens to seconds", () => {
    expect(
      voiceSecondsFromUsage({ output_token_details: { audio_tokens: 200 } }),
    ).toBe(10);
    expect(voiceSecondsFromUsage(undefined)).toBe(0);
  });
});

describe("worker request signing", () => {
  const secret = "s".repeat(32);
  const body = JSON.stringify({ meetingId: "m1" });

  it("accepts a fresh, correctly signed request", () => {
    const now = Date.now();
    expect(
      verifyWorkerRequest({
        secret,
        body,
        timestamp: String(now),
        signature: signWorkerRequest(secret, body, now),
        now,
      }),
    ).toBe(true);
  });

  it("rejects tampered bodies and stale timestamps", () => {
    const now = Date.now();
    const signature = signWorkerRequest(secret, body, now);
    expect(
      verifyWorkerRequest({ secret, body: "{}", timestamp: String(now), signature, now }),
    ).toBe(false);
    expect(
      verifyWorkerRequest({
        secret,
        body,
        timestamp: String(now),
        signature,
        now: now + 10 * 60 * 1000,
      }),
    ).toBe(false);
  });
});

describe("effectiveAiMode", () => {
  it("answers only when called once two people are in the room", () => {
    expect(effectiveAiMode("conversational", 1)).toBe("conversational");
    expect(effectiveAiMode("conversational", 2)).toBe("on_demand");
    expect(effectiveAiMode("facilitator", 3)).toBe("facilitator");
  });
});

describe("readAgentControl", () => {
  it("reads the mode and ask counter from the call's custom data", () => {
    expect(readAgentControl({ meetingId: "m1", ai_mode: "silent", ai_ask_seq: 3, ai_ask_by: "Lan" })).toEqual({
      mode: "silent",
      askSeq: 3,
      askBy: "Lan",
    });
    expect(readAgentControl({ ai_mode: "loud", ai_ask_seq: "x" })).toEqual({ mode: null, askSeq: 0, askBy: null });
    expect(readAgentControl(undefined)).toEqual({ mode: null, askSeq: 0, askBy: null });
  });
});
