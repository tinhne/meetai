import { describe, expect, it } from "vitest";

import { hasMeetingRole, resolveMeetingRole } from "./authz-rules";

describe("resolveMeetingRole", () => {
  it("gives the owner the host role", () => {
    expect(resolveMeetingRole({ userId: "user-a" }, "user-a")).toBe("host");
  });

  it("gives other users no access", () => {
    expect(resolveMeetingRole({ userId: "user-a" }, "user-b")).toBeNull();
  });
});

describe("hasMeetingRole", () => {
  it("denies users without a role", () => {
    expect(hasMeetingRole(null, "participant")).toBe(false);
    expect(hasMeetingRole(null, "host")).toBe(false);
  });

  it("lets hosts do participant actions", () => {
    expect(hasMeetingRole("host", "participant")).toBe(true);
    expect(hasMeetingRole("host", "host")).toBe(true);
  });

  it("keeps host actions away from participants", () => {
    expect(hasMeetingRole("participant", "host")).toBe(false);
  });
});
