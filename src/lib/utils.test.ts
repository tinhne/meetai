import { describe, expect, it } from "vitest";

import { formatTimestamp } from "./utils";

describe("formatTimestamp", () => {
  it("formats short offsets as m:ss", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65_000)).toBe("1:05");
  });

  it("includes hours for meetings longer than an hour", () => {
    expect(formatTimestamp(3_725_000)).toBe("1:02:05");
  });

  it("clamps negative values", () => {
    expect(formatTimestamp(-500)).toBe("0:00");
  });
});
