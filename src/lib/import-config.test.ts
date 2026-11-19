import { describe, expect, it } from "vitest";

import {
  clampNumber,
  normalizeImportedLayout,
  normalizeImportedSticky,
  parseImportedConfig,
  toFiniteNumber,
} from "./import-config";
import type { Sticky } from "./types";

const defaults: Omit<Sticky, "text"> = {
  x: 10,
  y: 20,
  width: 20,
  height: 10,
  zIndex: 5,
};

describe("toFiniteNumber", () => {
  it("keeps finite numbers and numeric strings", () => {
    expect(toFiniteNumber(42, 0)).toBe(42);
    expect(toFiniteNumber("12.5", 0)).toBe(12.5);
  });

  it("falls back for invalid values", () => {
    expect(toFiniteNumber("", 9)).toBe(9);
    expect(toFiniteNumber("abc", 9)).toBe(9);
    expect(toFiniteNumber("1e309", 9)).toBe(9);
    expect(toFiniteNumber(Number.POSITIVE_INFINITY, 9)).toBe(9);
    expect(toFiniteNumber(null, 9)).toBe(9);
    expect(toFiniteNumber(true, 9)).toBe(9);
  });
});

describe("clampNumber", () => {
  it("keeps values inside the range", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(11, 0, 10)).toBe(10);
  });
});

describe("normalizeImportedLayout", () => {
  it("returns defaults when no config is present", () => {
    expect(normalizeImportedLayout(undefined, defaults)).toEqual(defaults);
  });

  it("clamps out-of-range layout values", () => {
    expect(
      normalizeImportedLayout(
        {
          path: "./note.md",
          x: -500,
          y: "abc",
          width: -20,
          height: 9999,
          zIndex: 999999,
        },
        defaults,
      ),
    ).toEqual({
      x: 0,
      y: 20,
      width: 10,
      height: 50,
      zIndex: 999,
    });
  });

  it("rounds values and falls back for non-finite numbers", () => {
    expect(
      normalizeImportedLayout(
        {
          path: "./note.md",
          x: "1e309",
          y: 200.6,
          width: 12.7,
          height: "0",
          zIndex: -5,
        },
        defaults,
      ),
    ).toEqual({
      x: 10,
      y: 201,
      width: 13,
      height: 10,
      zIndex: 1,
    });
  });
});

describe("normalizeImportedSticky", () => {
  it("forces imported text to a string", () => {
    expect(
      normalizeImportedSticky({ path: "./note.md" }, defaults, 123),
    ).toEqual({ ...defaults, text: "" });
    expect(
      normalizeImportedSticky({ path: "./note.md" }, defaults, "# Title"),
    ).toEqual({ ...defaults, text: "# Title" });
  });
});

describe("parseImportedConfig", () => {
  it("ignores non-record values", () => {
    expect(parseImportedConfig(null)).toEqual({});
    expect(parseImportedConfig([])).toEqual({});
    expect(parseImportedConfig("config")).toEqual({});
  });

  it("keeps only entries with a string path and a safe id", () => {
    const parsed = JSON.parse(
      JSON.stringify({
        "1700000000000-a": { path: "./a.md", x: 1 },
        "bad id": { path: "./bad.md" },
        "path-not-string": { path: 42 },
        "not-an-object": "nope",
      }),
    );

    const config = parseImportedConfig(parsed);

    expect(Object.keys(config)).toEqual(["1700000000000-a"]);
    expect(config["1700000000000-a"]).toMatchObject({
      path: "./a.md",
      x: 1,
    });
  });

  it("rejects prototype-related keys", () => {
    const parsed = JSON.parse(
      '{"__proto__":{"path":"./x.md"},"constructor":{"path":"./y.md"},"prototype":{"path":"./z.md"}}',
    );

    const config = parseImportedConfig(parsed);

    expect(Object.keys(config)).toEqual([]);
    expect(Object.getPrototypeOf(config)).toBeNull();
    expect(Object.prototype).not.toHaveProperty("path");
  });
});
