import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getInitialChristmasThemeState } from "./christmas-theme";

class MemoryStorage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const december = new Date(2026, 11, 25, 12);
const january = new Date(2027, 0, 5, 12);

describe("getInitialChristmasThemeState", () => {
  it("stays off outside December when there is no preference", () => {
    expect(getInitialChristmasThemeState(january)).toEqual({
      enabled: false,
      autoEnabled: false,
    });
  });

  it("auto-enables once in December and records the season", () => {
    expect(getInitialChristmasThemeState(december)).toEqual({
      enabled: true,
      autoEnabled: true,
    });
    expect(storage.getItem("christmasThemeEnabled")).toBe("1");
    expect(storage.getItem("christmasThemeAutoSeason")).toBe("2026-12");
  });

  it("stays on during December without repeating the notice", () => {
    getInitialChristmasThemeState(december);
    expect(getInitialChristmasThemeState(december)).toEqual({
      enabled: true,
      autoEnabled: false,
    });
  });

  it("never overrides an explicit user off", () => {
    storage.setItem("christmasThemeEnabled", "0");
    expect(getInitialChristmasThemeState(december)).toEqual({
      enabled: false,
      autoEnabled: false,
    });
  });

  it("turns an auto-enabled theme off after the season", () => {
    getInitialChristmasThemeState(december);
    expect(getInitialChristmasThemeState(january)).toEqual({
      enabled: false,
      autoEnabled: false,
    });
    expect(storage.getItem("christmasThemeEnabled")).toBeNull();
    expect(storage.getItem("christmasThemeAutoSeason")).toBeNull();
  });

  it("keeps an explicit user on outside December", () => {
    storage.setItem("christmasThemeEnabled", "1");
    expect(getInitialChristmasThemeState(january)).toEqual({
      enabled: true,
      autoEnabled: false,
    });
  });
});
