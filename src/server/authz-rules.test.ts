import { describe, expect, it } from "vitest";

import { hasMeetingRole, resolveMeetingRole } from "./authz-rules";

describe("resolveMeetingRole", () => {
  const meeting = { userId: "owner" };

  it("gives the creator the owner role", () => {
    expect(resolveMeetingRole(meeting, "owner")).toBe("owner");
  });

  it("gives strangers no access", () => {
    expect(resolveMeetingRole(meeting, "stranger")).toBeNull();
    expect(resolveMeetingRole(meeting, "stranger", null)).toBeNull();
  });

  it("only admitted participants get access", () => {
    for (const status of ["waiting", "denied", "removed"] as const) {
      expect(
        resolveMeetingRole(meeting, "u", { role: "participant", status }),
      ).toBeNull();
    }
    expect(
      resolveMeetingRole(meeting, "u", { role: "participant", status: "admitted" }),
    ).toBe("participant");
  });

  it("maps co-hosts to the host role", () => {
    expect(
      resolveMeetingRole(meeting, "u", { role: "cohost", status: "admitted" }),
    ).toBe("host");
  });
});

describe("hasMeetingRole", () => {
  it("denies users without a role", () => {
    expect(hasMeetingRole(null, "participant")).toBe(false);
  });

  it("orders owner > host > participant", () => {
    expect(hasMeetingRole("owner", "host")).toBe(true);
    expect(hasMeetingRole("host", "participant")).toBe(true);
    expect(hasMeetingRole("host", "owner")).toBe(false);
    expect(hasMeetingRole("participant", "host")).toBe(false);
  });
});
