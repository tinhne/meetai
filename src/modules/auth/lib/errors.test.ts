import { describe, expect, it } from "vitest";

import { getAuthErrorKey } from "./errors";

describe("getAuthErrorKey", () => {
  it("maps known Better Auth codes", () => {
    expect(getAuthErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "INVALID_EMAIL_OR_PASSWORD",
    );
    expect(
      getAuthErrorKey({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }),
    ).toBe("USER_ALREADY_EXISTS");
  });

  it("treats 429 as rate limited", () => {
    expect(getAuthErrorKey({ status: 429 })).toBe("TOO_MANY_REQUESTS");
  });

  it("falls back to a generic message", () => {
    expect(getAuthErrorKey({ code: "SOMETHING_NEW", status: 500 })).toBe(
      "generic",
    );
  });
});
