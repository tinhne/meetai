import { describe, expect, it } from "vitest";

import { createGuestToken, verifyGuestToken } from "./guest-token";
import { cleanGuestName, decideJoin, hasRoomForMore } from "./participants";

describe("decideJoin", () => {
  it("always admits the owner", () => {
    expect(decideJoin({ joinMode: "locked", isOwner: true })).toBe("admitted");
  });

  it("follows the room's join mode for everyone else", () => {
    expect(decideJoin({ joinMode: "approval", isOwner: false })).toBe("waiting");
    expect(decideJoin({ joinMode: "open", isOwner: false })).toBe("admitted");
    expect(decideJoin({ joinMode: "locked", isOwner: false })).toBe("locked");
  });
});

describe("hasRoomForMore", () => {
  it("enforces the plan's participant limit", () => {
    expect(hasRoomForMore(2, 3)).toBe(true);
    expect(hasRoomForMore(3, 3)).toBe(false);
  });
});

describe("cleanGuestName", () => {
  it("collapses whitespace and caps the length", () => {
    expect(cleanGuestName("  Trần   Văn  A ")).toBe("Trần Văn A");
    expect(cleanGuestName("x".repeat(100))).toHaveLength(60);
  });
});

describe("guest tokens", () => {
  const secret = "s".repeat(32);

  it("round-trips a valid token", () => {
    const token = createGuestToken({ secret, participantId: "p1", meetingId: "m1" });
    expect(verifyGuestToken({ secret, token })).toEqual({
      participantId: "p1",
      meetingId: "m1",
    });
  });

  it("rejects tampering, other secrets and expired tokens", () => {
    const now = Date.now();
    const token = createGuestToken({ secret, participantId: "p1", meetingId: "m1", now });
    expect(verifyGuestToken({ secret, token: token.replace("p1", "p2") })).toBeNull();
    expect(verifyGuestToken({ secret: "o".repeat(32), token })).toBeNull();
    expect(
      verifyGuestToken({ secret, token, now: now + 13 * 60 * 60 * 1000 }),
    ).toBeNull();
    expect(verifyGuestToken({ secret, token: "garbage" })).toBeNull();
  });
});
