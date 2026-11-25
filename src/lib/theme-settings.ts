/**
 * Parses a persisted boolean theme setting.
 * @param {string | null} value Stored value ("1", "0", or null).
 * @param {boolean} fallback Value used when the setting is missing or unknown.
 * @returns {boolean} Parsed setting.
 */
export function parseThemeSetting(
  value: string | null,
  fallback: boolean,
): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

/**
 * Returns the Christmas season key for a date, or null outside December.
 * The season is December 1–31 in the browser's local timezone.
 * @param {Date} date Date to inspect.
 * @returns {string | null} Key in `YYYY-12` format, or null.
 */
export function getChristmasSeasonKey(date: Date): string | null {
  if (date.getMonth() !== 11) return null;
  return `${date.getFullYear()}-12`;
}

/**
 * Returns whether a date is inside the Christmas season.
 * @param {Date} date Date to inspect.
 * @returns {boolean} True in December.
 */
export function isChristmasSeason(date: Date): boolean {
  return getChristmasSeasonKey(date) !== null;
}
