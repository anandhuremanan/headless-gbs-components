import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  buildMonth,
  buildMonths,
  clampDate,
  compareDay,
  getISOWeek,
  isInRange,
  isSameDay,
  moveByKey,
  moveInGrid,
  normalizeRange,
  parseISODate,
  toDate,
  toISODate,
  yearPage,
} from "../core/calendar";
import { getServerToday, getToday, subscribeToToday } from "../core/today";
import {
  fieldOrder,
  inputPlaceholder,
  monthNames,
  parseDate,
  weekdayNames,
} from "../core/format";

const iso = (date: Date | null) => (date ? toISODate(date) : null);

describe("date normalization", () => {
  it("reads ISO strings as local days, never shifted by the time zone", () => {
    expect(iso(toDate("2026-03-12"))).toBe("2026-03-12");
    expect(iso(toDate(new Date(2026, 2, 12, 23, 59)))).toBe("2026-03-12");
    expect(toDate(null)).toBeNull();
    expect(toDate("not a date")).toBeNull();
    expect(parseISODate("2026-02-31")).toBeNull();
  });

  it("compares and matches days regardless of the time", () => {
    expect(compareDay(new Date(2026, 0, 1, 23), new Date(2026, 0, 2, 0))).toBeLessThan(0);
    expect(isSameDay(new Date(2026, 0, 1, 23), new Date(2026, 0, 1))).toBe(true);
    expect(isSameDay(null, new Date(2026, 0, 1))).toBe(false);
  });

  it("keeps the day of the month when a month is too short", () => {
    expect(iso(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(iso(addMonths(new Date(2024, 0, 31), 1))).toBe("2024-02-29");
    expect(iso(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
  });

  it("clamps to the limits", () => {
    const min = new Date(2026, 0, 10);
    const max = new Date(2026, 0, 20);
    expect(iso(clampDate(new Date(2026, 0, 1), min, max))).toBe("2026-01-10");
    expect(iso(clampDate(new Date(2026, 0, 31), min, max))).toBe("2026-01-20");
    expect(iso(clampDate(new Date(2026, 0, 15), min, max))).toBe("2026-01-15");
  });
});

describe("month building", () => {
  const today = new Date(2026, 1, 10);

  it("returns six aligned weeks with the leading days of the previous month", () => {
    const february = buildMonth(2026, 1, { weekStartsOn: 1, today });
    expect(february.weeks).toHaveLength(6);
    expect(february.weeks[0].days).toHaveLength(7);
    // February 2026 starts on a Sunday, so a Monday-first grid opens on 26 January.
    expect(february.weeks[0].days[0].key).toBe("2026-01-26");
    expect(february.weeks[0].days[0].outside).toBe(true);
    expect(february.weeks[0].days[6].key).toBe("2026-02-01");
    expect(february.weeks[0].days[6].outside).toBe(false);
  });

  it("starts the week where the caller asks", () => {
    const sundayFirst = buildMonth(2026, 1, { weekStartsOn: 0, today });
    expect(sundayFirst.weeks[0].days[0].key).toBe("2026-02-01");
  });

  it("marks today, weekends and days outside the limits", () => {
    const february = buildMonth(2026, 1, {
      weekStartsOn: 1,
      today,
      min: new Date(2026, 1, 5),
      isDateDisabled: (date) => date.getDate() === 20,
    });
    const days = february.weeks.flatMap((week) => week.days);
    const byKey = (key: string) => days.find((day) => day.key === key);

    expect(byKey("2026-02-10")?.today).toBe(true);
    expect(byKey("2026-02-09")?.today).toBe(false);
    expect(byKey("2026-02-07")?.weekend).toBe(true);
    expect(byKey("2026-02-04")?.disabled).toBe(true);
    expect(byKey("2026-02-05")?.disabled).toBe(false);
    expect(byKey("2026-02-20")?.disabled).toBe(true);
  });

  it("builds consecutive months for a range view", () => {
    const months = buildMonths(new Date(2026, 10, 20), 2, { today });
    expect(months.map((month) => `${month.year}-${month.month}`)).toEqual(["2026-10", "2026-11"]);
  });

  it("numbers ISO weeks, including the ones spanning a year end", () => {
    expect(getISOWeek(new Date(2024, 0, 1))).toBe(1);
    expect(getISOWeek(new Date(2026, 0, 1))).toBe(1);
    expect(getISOWeek(new Date(2021, 0, 1))).toBe(53);
  });
});

describe("ranges", () => {
  it("puts a backwards range the right way round", () => {
    const start = new Date(2026, 0, 20);
    const end = new Date(2026, 0, 10);
    expect(iso(normalizeRange({ start, end }).start)).toBe("2026-01-10");
    expect(iso(normalizeRange({ start, end }).end)).toBe("2026-01-20");
    expect(normalizeRange({ start, end: null }).end).toBeNull();
  });

  it("includes both ends", () => {
    const start = new Date(2026, 0, 10);
    const end = new Date(2026, 0, 20);
    expect(isInRange(new Date(2026, 0, 10), start, end)).toBe(true);
    expect(isInRange(new Date(2026, 0, 20), start, end)).toBe(true);
    expect(isInRange(new Date(2026, 0, 21), start, end)).toBe(false);
    expect(isInRange(new Date(2026, 0, 15), start, null)).toBe(false);
  });
});

describe("keyboard movement", () => {
  const wednesday = new Date(2026, 1, 11);

  it("moves by day, week and month", () => {
    expect(iso(moveByKey(wednesday, "ArrowLeft"))).toBe("2026-02-10");
    expect(iso(moveByKey(wednesday, "ArrowRight"))).toBe("2026-02-12");
    expect(iso(moveByKey(wednesday, "ArrowUp"))).toBe("2026-02-04");
    expect(iso(moveByKey(wednesday, "ArrowDown"))).toBe("2026-02-18");
    expect(iso(moveByKey(wednesday, "PageUp"))).toBe("2026-01-11");
    expect(iso(moveByKey(wednesday, "PageDown"))).toBe("2026-03-11");
    expect(iso(moveByKey(wednesday, "PageUp", { shiftKey: true }))).toBe("2025-02-11");
    expect(iso(moveByKey(wednesday, "PageDown", { shiftKey: true }))).toBe("2027-02-11");
    expect(moveByKey(wednesday, "a")).toBeNull();
  });

  it("takes Home and End to the ends of the displayed week", () => {
    expect(iso(moveByKey(wednesday, "Home", { weekStartsOn: 1 }))).toBe("2026-02-09");
    expect(iso(moveByKey(wednesday, "End", { weekStartsOn: 1 }))).toBe("2026-02-15");
    expect(iso(moveByKey(wednesday, "Home", { weekStartsOn: 0 }))).toBe("2026-02-08");
    expect(iso(moveByKey(wednesday, "End", { weekStartsOn: 0 }))).toBe("2026-02-14");
  });

  it("swaps the arrows in right-to-left layouts", () => {
    expect(iso(moveByKey(wednesday, "ArrowRight", { rtl: true }))).toBe("2026-02-10");
    expect(iso(moveByKey(wednesday, "ArrowLeft", { rtl: true }))).toBe("2026-02-12");
  });

  it("moves inside the month and year panels without leaving the grid", () => {
    expect(moveInGrid(4, "ArrowDown", 3, 12)).toBe(7);
    expect(moveInGrid(10, "ArrowDown", 3, 12)).toBe(11);
    expect(moveInGrid(1, "ArrowUp", 3, 12)).toBe(0);
    expect(moveInGrid(5, "Home", 3, 12)).toBe(0);
    expect(moveInGrid(5, "End", 3, 12)).toBe(11);
    expect(moveInGrid(5, "Enter", 3, 12)).toBeNull();
  });

  it("pages years in steady blocks", () => {
    expect(yearPage(2026, 12)[0]).toBe(2016);
    expect(yearPage(2026, 12)).toHaveLength(12);
    expect(yearPage(2016, 12)[0]).toBe(2016);
  });
});

describe("locale formatting", () => {
  it("reports the field order and a matching placeholder", () => {
    expect(fieldOrder("en-GB")).toEqual(["day", "month", "year"]);
    expect(fieldOrder("en-US")).toEqual(["month", "day", "year"]);
    expect(inputPlaceholder("en-GB")).toBe("dd/mm/yyyy");
    expect(inputPlaceholder("en-US")).toBe("mm/dd/yyyy");
  });

  it("orders weekday names from the first day of the week", () => {
    expect(weekdayNames("en-GB", 1)[0].short).toBe("Mon");
    expect(weekdayNames("en-US", 0)[0].short).toBe("Sun");
    expect(weekdayNames("en-GB", 1)[0].long).toBe("Monday");
    expect(monthNames("en-GB")[0]).toBe("January");
  });
});

describe("typed input", () => {
  const reference = new Date(2026, 4, 20);

  it("accepts ISO whatever the locale", () => {
    expect(iso(parseDate("2026-03-12", "en-US", reference))).toBe("2026-03-12");
  });

  it("reads numbers in the locale's own order", () => {
    expect(iso(parseDate("3/4/2026", "en-GB", reference))).toBe("2026-04-03");
    expect(iso(parseDate("3/4/2026", "en-US", reference))).toBe("2026-03-04");
    expect(iso(parseDate("15.8.2026", "de-DE", reference))).toBe("2026-08-15");
  });

  it("fills in what was left out", () => {
    expect(iso(parseDate("15/8", "en-GB", reference))).toBe("2026-08-15");
    expect(iso(parseDate("5", "en-GB", reference))).toBe("2026-05-05");
    expect(iso(parseDate("15/8/26", "en-GB", reference))).toBe("2026-08-15");
    expect(iso(parseDate("15/8/95", "en-GB", reference))).toBe("1995-08-15");
  });

  it("understands written month names", () => {
    expect(iso(parseDate("12 Mar 2026", "en-GB", reference))).toBe("2026-03-12");
    expect(iso(parseDate("March 12, 2026", "en-US", reference))).toBe("2026-03-12");
    expect(iso(parseDate("7 September", "en-GB", reference))).toBe("2026-09-07");
  });

  it("rejects anything that isn't a date", () => {
    expect(parseDate("", "en-GB", reference)).toBeNull();
    expect(parseDate("hello", "en-GB", reference)).toBeNull();
    expect(parseDate("31/2/2026", "en-GB", reference)).toBeNull();
    expect(parseDate("2026-02-31", "en-GB", reference)).toBeNull();
    expect(parseDate("45/45/2026", "en-GB", reference)).toBeNull();
  });
});


describe("today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks no day at all when the calendar is built without one", () => {
    // What a server render and the hydrating render pass, so the markup carries
    // no date the browser might disagree with.
    const month = buildMonth(2026, 8, { today: null });
    const marked = month.weeks.flatMap((week) => week.days).filter((day) => day.today);
    expect(marked).toHaveLength(0);
  });

  it("serves the same day object until the day changes", () => {
    expect(getToday()).toBe(getToday());
    expect(getServerToday()).toBeNull();
  });

  it("rolls over at the next local midnight and tells its subscribers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 23, 30));

    const seen: string[] = [];
    const unsubscribe = subscribeToToday(() => seen.push(toISODate(getToday())));
    expect(toISODate(getToday())).toBe("2026-09-18");

    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(seen).toEqual([]);

    vi.advanceTimersByTime(60 * 1000);
    expect(seen).toEqual(["2026-09-19"]);
    expect(toISODate(getToday())).toBe("2026-09-19");

    unsubscribe();
  });

  it("catches up after a machine sleeps through midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 23, 59));

    const seen: string[] = [];
    const unsubscribe = subscribeToToday(() => seen.push(toISODate(getToday())));
    // The clock jumps two days while the timer never gets to run.
    vi.setSystemTime(new Date(2026, 8, 20, 9, 0));
    vi.advanceTimersByTime(60 * 1000);

    expect(seen).toEqual(["2026-09-20"]);
    unsubscribe();
  });
});
