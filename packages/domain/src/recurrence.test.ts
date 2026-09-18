import { describe, expect, it } from "vitest";
import {
  computeDueOccurrences,
  nextOccurrenceAfter,
  periodKeyFor,
} from "./recurrence";

function utc(iso: string) {
  return new Date(iso);
}

describe("computeDueOccurrences", () => {
  it("returns only the anchor occurrence when asOf is before the next one", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-01-20T00:00:00.000Z"),
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("returns every monthly occurrence up to and including asOf", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-04-01T00:00:00.000Z"),
    );
    expect(result.map((d) => periodKeyFor(d))).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
    ]);
  });

  it("respects a multi-month interval (quarterly)", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 3,
      },
      utc("2026-12-31T00:00:00.000Z"),
    );
    expect(result.map((d) => periodKeyFor(d))).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
  });

  it("skips occurrences before startDate even if anchor is earlier", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-03-01T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-04-01T00:00:00.000Z"),
    );
    // Ocak ve Şubat anchor'dan önceki startDate'in altında kaldığı için
    // atlanır; Mart ve sonrası döner.
    expect(result.map((d) => periodKeyFor(d))).toEqual([
      "2026-03-15",
    ]);
  });

  it("stops at endDate even if asOf is later", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: utc("2026-03-01T00:00:00.000Z"),
        intervalMonths: 1,
      },
      utc("2026-12-31T00:00:00.000Z"),
    );
    expect(result.map((d) => periodKeyFor(d))).toEqual([
      "2026-01-15",
      "2026-02-15",
    ]);
  });

  it("returns an empty array when asOf is before startDate", () => {
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-01-01T00:00:00.000Z"),
    );
    expect(result).toEqual([]);
  });

  it("handles a day-of-month rollover across shorter months", () => {
    // 31 Ocak + 1 ay -> Şubat 2026'da 31 yok (2026 artık yıl değil),
    // JS'in standart taşma davranışıyla Mart'ın 3'üne kayar.
    const result = computeDueOccurrences(
      {
        anchorDate: utc("2026-01-31T09:00:00.000Z"),
        startDate: utc("2026-01-31T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-03-05T00:00:00.000Z"),
    );
    expect(result.map((d) => periodKeyFor(d))).toEqual([
      "2026-01-31",
      "2026-03-03",
    ]);
  });
});

describe("periodKeyFor", () => {
  it("formats the UTC calendar date", () => {
    expect(periodKeyFor(utc("2026-09-14T21:45:00.000Z"))).toBe("2026-09-14");
  });
});

describe("nextOccurrenceAfter", () => {
  it("returns the anchor occurrence when asOf is before it", () => {
    const result = nextOccurrenceAfter(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-01-01T00:00:00.000Z"),
    );
    expect(result?.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("returns the next occurrence strictly after asOf, not asOf itself", () => {
    const result = nextOccurrenceAfter(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-01-15T09:00:00.000Z"),
    );
    expect(result?.toISOString()).toBe("2026-02-15T09:00:00.000Z");
  });

  it("skips ahead to startDate before looking for the next occurrence", () => {
    const result = nextOccurrenceAfter(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-03-01T00:00:00.000Z"),
        endDate: null,
        intervalMonths: 1,
      },
      utc("2026-01-20T00:00:00.000Z"),
    );
    expect(result?.toISOString()).toBe("2026-03-15T09:00:00.000Z");
  });

  it("returns null once the next occurrence would fall after endDate", () => {
    const result = nextOccurrenceAfter(
      {
        anchorDate: utc("2026-01-15T09:00:00.000Z"),
        startDate: utc("2026-01-15T00:00:00.000Z"),
        endDate: utc("2026-02-01T00:00:00.000Z"),
        intervalMonths: 1,
      },
      utc("2026-01-20T00:00:00.000Z"),
    );
    expect(result).toBeNull();
  });
});
