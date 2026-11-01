import { describe, expect, it } from "vitest";

import { buildIcsInvite } from "./ics";

describe("buildIcsInvite", () => {
  it("builds a valid single event with escaped text", () => {
    const ics = buildIcsInvite({
      uid: "m1",
      title: "Họp, chốt giá; Q4",
      description: "Agenda",
      url: "https://example.com/j/abc",
      start: new Date("2026-11-02T09:00:00.000Z"),
      durationMinutes: 45,
      now: new Date("2026-11-01T00:00:00.000Z"),
    });

    expect(ics).toContain("DTSTART:20261102T090000Z");
    expect(ics).toContain("DTEND:20261102T094500Z");
    expect(ics).toContain("SUMMARY:Họp\\, chốt giá\; Q4");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VALARM\r\nACTION:DISPLAY");
    expect(ics).toContain("TRIGGER:-PT15M");
  });
});
