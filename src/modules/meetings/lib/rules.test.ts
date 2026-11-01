import { describe, expect, it } from "vitest";

import { canEnterCall, canJoinMeeting, planMeetingUpdate } from "./rules";

const input = {
  name: "Weekly sync",
  agentId: "agent-1",
  language: "vi",
  template: "general",
  aiMode: "conversational",
};

describe("planMeetingUpdate", () => {
  it("only applies whitelisted fields", () => {
    const now = new Date("2026-11-01T00:00:00.000Z");
    const plan = planMeetingUpdate(
      { status: "upcoming", agentId: "agent-1", language: "vi" },
      {
        ...input,
        agenda: "Roadmap",
        scheduledAt: "2026-11-02T09:00:00.000Z",
        // Extra keys must never reach the database update.
        ...({ userId: "attacker", status: "completed" } as object),
      },
      now,
    );

    expect(plan).toEqual({
      ok: true,
      agentChanged: false,
      languageChanged: false,
      changes: {
        name: "Weekly sync",
        agentId: "agent-1",
        language: "vi",
        template: "general",
        aiMode: "conversational",
        agenda: "Roadmap",
        scheduledAt: new Date("2026-11-02T09:00:00.000Z"),
        updatedAt: now,
      },
    });
  });

  it("allows changing agent and language before the meeting starts", () => {
    const plan = planMeetingUpdate(
      { status: "upcoming", agentId: "agent-1", language: "en" },
      { ...input, agentId: "agent-2" },
    );

    expect(plan.ok && plan.agentChanged && plan.languageChanged).toBe(true);
  });

  it("locks agent and language once the meeting has started", () => {
    for (const status of ["active", "completed", "processing"] as const) {
      const plan = planMeetingUpdate(
        { status, agentId: "agent-1", language: "vi" },
        { ...input, agentId: "agent-2" },
      );
      expect(plan.ok).toBe(false);
    }
  });

  it("still allows renaming a finished meeting", () => {
    const plan = planMeetingUpdate(
      { status: "completed", agentId: "agent-1", language: "vi" },
      { ...input, name: "Renamed" },
    );

    expect(plan.ok).toBe(true);
  });
});

describe("canJoinMeeting", () => {
  it("only allows upcoming and active meetings", () => {
    expect(canJoinMeeting("upcoming")).toBe(true);
    expect(canJoinMeeting("active")).toBe(true);
    for (const status of [
      "completed",
      "processing",
      "cancelled",
      "failed",
    ] as const) {
      expect(canJoinMeeting(status)).toBe(false);
    }
  });
});

describe("canEnterCall", () => {
  it("lets only the host start a meeting", () => {
    expect(canEnterCall("upcoming", true)).toBe(true);
    expect(canEnterCall("upcoming", false)).toBe(false);
    expect(canEnterCall("active", false)).toBe(true);
    expect(canEnterCall("processing", true)).toBe(false);
  });
});
