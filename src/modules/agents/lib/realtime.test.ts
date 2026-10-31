import { describe, expect, it } from "vitest";

import {
  buildRealtimeSessionConfig,
  voiceSecondsFromUsage,
} from "./realtime";
import { signWorkerRequest, verifyWorkerRequest } from "./worker-auth";

const context = {
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
