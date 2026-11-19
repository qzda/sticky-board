/**
 * Checks whether a value is a plain object record.
 * @param {unknown} value The value to validate.
 * @returns {value is Record<string, unknown>} True when value is a non-null object and not an array.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
