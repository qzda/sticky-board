import { describe, expect, it } from "vitest";

import {
  getChristmasSeasonKey,
  isChristmasSeason,
  parseThemeSetting,
} from "./theme-settings";

describe("parseThemeSetting", () => {
  it("reads explicit values", () => {
    expect(parseThemeSetting("1", false)).toBe(true);
    expect(parseThemeSetting("0", true)).toBe(false);
  });

  it("uses the fallback for missing or unknown values", () => {
    expect(parseThemeSetting(null, true)).toBe(true);
    expect(parseThemeSetting(null, false)).toBe(false);
    expect(parseThemeSetting("unexpected", true)).toBe(true);
    expect(parseThemeSetting("unexpected", false)).toBe(false);
  });
});

describe("Christmas season", () => {
  it("is active only in December", () => {
    expect(isChristmasSeason(new Date(2026, 10, 30, 12))).toBe(false);
    expect(isChristmasSeason(new Date(2026, 11, 1, 0))).toBe(true);
    expect(isChristmasSeason(new Date(2026, 11, 25, 12))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 1, 0))).toBe(false);
  });

  it("uses a stable key per December", () => {
    expect(getChristmasSeasonKey(new Date(2026, 11, 25))).toBe("2026-12");
    expect(getChristmasSeasonKey(new Date(2027, 0, 1))).toBeNull();
  });
});
