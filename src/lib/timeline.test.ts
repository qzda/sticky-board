import { describe, expect, it } from "vitest";

import { getDateKey, getStickyTimestamp, groupStickysByDay } from "./timeline";
import type { Stickys } from "./types";

const makeSticky = (text: string) => ({
  x: 0,
  y: 0,
  width: 20,
  height: 10,
  zIndex: 1,
  text,
});

describe("getStickyTimestamp", () => {
  it("reads the numeric id prefix", () => {
    expect(getStickyTimestamp("1700000000000-abc")).toBe(1700000000000);
    expect(getStickyTimestamp("12-34")).toBe(12);
  });

  it("falls back to 0 for invalid ids", () => {
    expect(getStickyTimestamp("not-a-timestamp")).toBe(0);
    expect(getStickyTimestamp("")).toBe(0);
  });
});

describe("getDateKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    const timestamp = new Date(2026, 0, 5, 12).getTime();
    expect(getDateKey(timestamp)).toBe("2026-01-05");
  });
});

describe("groupStickysByDay", () => {
  it("groups by day and sorts days and ids newest-first", () => {
    const dayOne = new Date(2026, 0, 5, 12).getTime();
    const dayOneLater = dayOne + 1000;
    const dayTwo = new Date(2026, 0, 6, 12).getTime();

    const stickys: Stickys = {
      [`${dayOne}-a`]: makeSticky("a"),
      "not-a-timestamp": makeSticky("invalid"),
      [`${dayTwo}-b`]: makeSticky("b"),
      [`${dayOneLater}-c`]: makeSticky("c"),
    };

    const groups = groupStickysByDay(stickys);

    expect(groups.map((group) => group.day)).toEqual([
      getDateKey(dayTwo),
      getDateKey(dayOne),
      getDateKey(0),
    ]);
    expect(groups[0].ids).toEqual([`${dayTwo}-b`]);
    expect(groups[1].ids).toEqual([
      `${dayOneLater}-c`,
      `${dayOne}-a`,
    ]);
    expect(groups[2].ids).toEqual(["not-a-timestamp"]);
  });

  it("returns an empty list for an empty map", () => {
    expect(groupStickysByDay({})).toEqual([]);
  });
});
