import { describe, expect, it } from "vitest";
import {
  UNASSIGNED,
  addDays,
  addMonths,
  cellKey,
  computeRescheduledRange,
  endOfMonth,
  getMonthGrid,
  resolveDropChanges,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "./dispatch-calendar.helpers";

// Yerel saat kurucusu kullanılıyor (ay 0-indeksli): testler çalıştırılan
// makinenin saat diliminden bağımsız olsun diye ISO/UTC string'ler yerine
// bunu tercih ediyoruz — helper'ların kendisi de takvim günü hesaplarını
// kasıtlı olarak yerel saate göre yapıyor (bkz. dispatch-calendar.helpers.ts
// üzerindeki yorumlar).
function local(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe("startOfWeek", () => {
  it("returns the Monday of the given week regardless of weekday", () => {
    // 2026-09-17 bir Perşembe
    const monday = startOfWeek(local(2026, 9, 17, 18, 30));
    expect(toDateKey(monday)).toBe("2026-09-14");
  });

  it("keeps a Monday unchanged", () => {
    const monday = startOfWeek(local(2026, 9, 14, 9, 0));
    expect(toDateKey(monday)).toBe("2026-09-14");
  });

  it("rolls a Sunday back to the same week's Monday, not the next one", () => {
    const monday = startOfWeek(local(2026, 9, 20, 3, 0));
    expect(toDateKey(monday)).toBe("2026-09-14");
  });
});

describe("addDays / cellKey", () => {
  it("adds calendar days correctly across a month boundary", () => {
    const result = addDays(local(2026, 9, 29), 3);
    expect(toDateKey(result)).toBe("2026-10-02");
  });

  it("builds a stable memberId:dayKey identifier", () => {
    expect(cellKey("member-1", "2026-09-14")).toBe("member-1:2026-09-14");
  });
});

describe("resolveDropChanges", () => {
  const job = {
    scheduledStart: local(2026, 9, 14, 12, 0).toISOString(),
    assignments: [{ memberId: "member-a", primary: true }],
  };

  it("returns no changes when dropped back on the same technician and day", () => {
    expect(resolveDropChanges(job, cellKey("member-a", "2026-09-14"))).toEqual(
      {},
    );
  });

  it("detects a technician reassignment", () => {
    expect(
      resolveDropChanges(job, cellKey("member-b", "2026-09-14")),
    ).toEqual({ memberId: "member-b" });
  });

  it("detects a reschedule to a different day", () => {
    expect(
      resolveDropChanges(job, cellKey("member-a", "2026-09-15")),
    ).toEqual({ dayKey: "2026-09-15" });
  });

  it("detects both a reassignment and a reschedule at once", () => {
    expect(
      resolveDropChanges(job, cellKey("member-b", "2026-09-16")),
    ).toEqual({ memberId: "member-b", dayKey: "2026-09-16" });
  });

  it("never treats dropping on the unassigned lane as a reassignment", () => {
    expect(resolveDropChanges(job, cellKey(UNASSIGNED, "2026-09-14"))).toEqual(
      {},
    );
  });

  it("still reports a reschedule when dropped on the unassigned lane on a new day", () => {
    expect(
      resolveDropChanges(job, cellKey(UNASSIGNED, "2026-09-17")),
    ).toEqual({ dayKey: "2026-09-17" });
  });
});

describe("startOfMonth / endOfMonth", () => {
  it("returns the 1st of the month regardless of the given day", () => {
    expect(toDateKey(startOfMonth(local(2026, 9, 17)))).toBe("2026-09-01");
  });

  it("returns the last day of a 30-day month", () => {
    expect(toDateKey(endOfMonth(local(2026, 9, 17)))).toBe("2026-09-30");
  });

  it("returns the last day of February in a non-leap year", () => {
    // 2026 % 4 !== 0, so February has 28 days
    expect(toDateKey(endOfMonth(local(2026, 2, 10)))).toBe("2026-02-28");
  });
});

describe("addMonths", () => {
  it("moves forward and backward by whole months", () => {
    expect(toDateKey(addMonths(local(2026, 9, 1), 1))).toBe("2026-10-01");
    expect(toDateKey(addMonths(local(2026, 9, 1), -1))).toBe("2026-08-01");
  });

  it("rolls over into the following month when the day does not exist there", () => {
    // February 2026 only has 28 days, so day 31 overflows into March
    expect(toDateKey(addMonths(local(2026, 1, 31), 1))).toBe("2026-03-03");
  });
});

describe("getMonthGrid", () => {
  it("builds a Monday-to-Sunday aligned 5-week grid for September 2026", () => {
    const grid = getMonthGrid(local(2026, 9, 17));
    expect(grid).toHaveLength(35);
    expect(toDateKey(grid[0]!)).toBe("2026-08-31");
    expect(toDateKey(grid.at(-1)!)).toBe("2026-10-04");
    expect(grid.some((d) => toDateKey(d) === "2026-09-01")).toBe(true);
    expect(grid.some((d) => toDateKey(d) === "2026-09-30")).toBe(true);
  });

  it("extends to a 6-week grid when the month starts on a Sunday", () => {
    // 2026-11-01 is a Sunday, so the grid needs a leading and trailing week
    const grid = getMonthGrid(local(2026, 11, 5));
    expect(grid).toHaveLength(42);
    expect(toDateKey(grid[0]!)).toBe("2026-10-26");
    expect(toDateKey(grid.at(-1)!)).toBe("2026-12-06");
  });

  it("always starts on a Monday and ends on a Sunday", () => {
    const grid = getMonthGrid(local(2026, 3, 1));
    expect(grid[0]!.getDay()).toBe(1);
    expect(grid.at(-1)!.getDay()).toBe(0);
    expect(grid.length % 7).toBe(0);
  });
});

describe("computeRescheduledRange", () => {
  it("preserves the time of day while moving to the new day", () => {
    const result = computeRescheduledRange(
      local(2026, 9, 14, 9, 30).toISOString(),
      "2026-09-16",
      90,
    );
    expect(result.scheduledStart).toBe(local(2026, 9, 16, 9, 30).toISOString());
    expect(result.scheduledEnd).toBe(local(2026, 9, 16, 11, 0).toISOString());
  });

  it("defaults to a 60 minute duration when the job has none estimated", () => {
    const result = computeRescheduledRange(
      local(2026, 9, 14, 9, 30).toISOString(),
      "2026-09-16",
      null,
    );
    expect(result.scheduledEnd).toBe(local(2026, 9, 16, 10, 30).toISOString());
  });
});
