import { describe, expect, it } from "vitest";

import { createInvitePass, verifyInvitePass } from "./invite-pass";

const base = { secret: "s".repeat(32), meetingId: "m1", inviteCode: "code123456" };

describe("invite pass", () => {
  it("verifies a pass made for this meeting and invite code", () => {
    const pass = createInvitePass({ ...base, email: "Lan@Example.com " });

    expect(pass).not.toContain("@");
    expect(verifyInvitePass({ ...base, pass })).toBe(true);
  });

  it("rejects tampered passes and passes for an old invite code", () => {
    const pass = createInvitePass({ ...base, email: "lan@example.com" });

    expect(verifyInvitePass({ ...base, pass: `${pass}x` })).toBe(false);
    expect(verifyInvitePass({ ...base, inviteCode: "newcode123", pass })).toBe(false);
    expect(verifyInvitePass({ ...base, pass: undefined })).toBe(false);
  });
});
