import { createWeather } from "@fluritheme/fluri";
import type { WeatherController } from "@fluritheme/fluri";

import { getChristmasSeasonKey } from "../lib/theme-settings";

const CHRISTMAS_THEME_STORAGE_KEY = "christmasThemeEnabled";
const CHRISTMAS_AUTO_SEASON_KEY = "christmasThemeAutoSeason";

/** Initial theme state after reading the persisted preference. */
export type ChristmasThemeState = {
  enabled: boolean;
  autoEnabled: boolean;
};

let weather: WeatherController | null = null;

/**
 * Resolves the initial theme state.
 *
 * - "0" means the user explicitly turned it off and is never overridden.
 * - "1" means an explicit or auto-enabled choice.
 * - During December, a user with no preference is auto-enabled once and gets
 *   the `autoEnabled` flag so the UI can show the "can turn it off" notice.
 * - An auto-enabled theme is turned off lazily after the season ends.
 * @param {Date} now Current date, injectable for tests.
 * @returns {ChristmasThemeState} Resolved theme state.
 */
export function getInitialChristmasThemeState(
  now: Date = new Date(),
): ChristmasThemeState {
  let stored = localStorage.getItem(CHRISTMAS_THEME_STORAGE_KEY);
  const autoSeason = localStorage.getItem(CHRISTMAS_AUTO_SEASON_KEY);
  const season = getChristmasSeasonKey(now);

  if (autoSeason && autoSeason !== season) {
    localStorage.removeItem(CHRISTMAS_AUTO_SEASON_KEY);
    if (stored === "1") {
      localStorage.removeItem(CHRISTMAS_THEME_STORAGE_KEY);
      stored = null;
    }
  }

  if (stored === "0") return { enabled: false, autoEnabled: false };
  if (stored === "1") return { enabled: true, autoEnabled: false };
  if (!season) return { enabled: false, autoEnabled: false };

  if (autoSeason === season) {
    localStorage.setItem(CHRISTMAS_THEME_STORAGE_KEY, "1");
    return { enabled: true, autoEnabled: false };
  }

  localStorage.setItem(CHRISTMAS_THEME_STORAGE_KEY, "1");
  localStorage.setItem(CHRISTMAS_AUTO_SEASON_KEY, season);
  return { enabled: true, autoEnabled: true };
}

/**
 * Persists and applies a user choice.
 * @param {boolean} enabled Whether the theme should be active.
 * @returns {void}
 */
export function setChristmasThemeEnabled(enabled: boolean): void {
  localStorage.setItem(CHRISTMAS_THEME_STORAGE_KEY, enabled ? "1" : "0");
  localStorage.removeItem(CHRISTMAS_AUTO_SEASON_KEY);
  applyChristmasTheme(enabled);
}

/**
 * Applies the winter board and starts or destroys the Fluri weather engine.
 * @param {boolean} enabled Whether the theme should be active.
 * @returns {void}
 */
export function applyChristmasTheme(enabled: boolean): void {
  document.body.classList.toggle("christmas-theme", enabled);

  if (!enabled) {
    weather?.destroy();
    weather = null;
    return;
  }

  ensureWeather();
}

/**
 * Creates and starts the Fluri engine once.
 * `dom.detection: "explicit"` means only `[data-weather-surface]` elements
 * collect snow, which keeps card controls and settings clear.
 * @returns {void}
 */
function ensureWeather(): void {
  if (weather) return;

  try {
    weather = createWeather({
      preset: "gentle-snow",
      autoStart: false,
      dom: { detection: "explicit" },
      snow: {
        intensity: 0.55,
        particleCount: 520,
        accumulation: {
          enabled: true,
          maxDepth: 14,
          growthRate: 0.6,
          softness: 0.6,
        },
      },
      accessibility: { reducedMotion: "respect" },
      performance: { adaptive: true },
    });
    weather.start();
  } catch (error) {
    weather = null;
    console.warn("[christmas] failed to start snow", error);
  }
}
