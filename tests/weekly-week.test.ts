import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { getUpcomingSchoolWeekRange, getWeekdayNumber } from "@/lib/weekly-week";

describe("weekly week helpers", () => {
  it("returns ISO weekday numbers in a timezone", () => {
    const timezone = "America/Los_Angeles";
    expect(getWeekdayNumber(new Date("2026-04-13T12:00:00.000Z"), timezone)).toBe(1);
    expect(getWeekdayNumber(new Date("2026-04-17T12:00:00.000Z"), timezone)).toBe(5);
  });

  it("computes the upcoming school week as next Monday through Friday", () => {
    const timezone = "America/Los_Angeles";
    const now = new Date("2026-04-15T12:00:00.000Z");
    const range = getUpcomingSchoolWeekRange(now, timezone);

    expect(formatInTimeZone(range.start, timezone, "yyyy-MM-dd HH:mm:ss")).toBe("2026-04-20 00:00:00");
    expect(formatInTimeZone(range.end, timezone, "yyyy-MM-dd HH:mm:ss")).toBe("2026-04-24 23:59:59");
    expect(getWeekdayNumber(range.start, timezone)).toBe(1);
    expect(getWeekdayNumber(range.end, timezone)).toBe(5);
  });
});

