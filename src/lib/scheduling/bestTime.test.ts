import { describe, expect, it } from "vitest";
import { computeBestTimes } from "./bestTime";
import { dateOnlyToUtcMidnight } from "./grid";

describe("computeBestTimes", () => {
  const day = dateOnlyToUtcMidnight("2026-01-10", "UTC");

  const activity = {
    rangeStart: day,
    rangeEnd: day,
    dailyWindowStartMinute: 18 * 60, // 18:00
    dailyWindowEndMinute: 22 * 60, // 22:00
    slotGranularityMinutes: 30,
    durationMinutes: 120,
    timezone: "UTC",
  };

  function at(hours: number, minutes = 0) {
    return new Date(
      Date.UTC(2026, 0, 10, hours, minutes, 0, 0),
    );
  }

  it("ranks the window with the most fully-free respondents first", () => {
    const responses = [
      { userId: "A", slots: [{ startsAt: at(18), endsAt: at(20) }] },
      { userId: "B", slots: [{ startsAt: at(19), endsAt: at(21) }] },
      { userId: "C", slots: [{ startsAt: at(18), endsAt: at(22) }] },
    ];

    const results = computeBestTimes(activity, responses);

    expect(results[0].start.getTime()).toBe(at(18).getTime());
    expect(results[0].end.getTime()).toBe(at(20).getTime());
    expect(results[0].score).toBe(2);
    expect(new Set(results[0].freeUserIds)).toEqual(new Set(["A", "C"]));

    // The next-best non-overlapping window should be 20:00-22:00 with just C.
    expect(results[1].start.getTime()).toBe(at(20).getTime());
    expect(results[1].end.getTime()).toBe(at(22).getTime());
    expect(results[1].score).toBe(1);
  });

  it("returns no windows when nobody is free for the full duration", () => {
    const responses = [
      { userId: "A", slots: [{ startsAt: at(18), endsAt: at(18, 30) }] },
    ];

    expect(computeBestTimes(activity, responses)).toEqual([]);
  });

  it("returns an empty array when there are no responses", () => {
    expect(computeBestTimes(activity, [])).toEqual([]);
  });
});
