import type { Stickys } from "./types";

/** One timeline day group. */
export type TimelineGroup = {
  day: string;
  ids: string[];
};

/**
 * Reads the timestamp prefix from a sticky id.
 * @param {string} id Sticky id.
 * @returns {number} Timestamp in milliseconds, or 0 when the prefix is invalid.
 */
export function getStickyTimestamp(id: string): number {
  const firstSegment = id.split("-")[0];
  const timestamp = Number(firstSegment);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Formats a timestamp into a local date key (YYYY-MM-DD).
 * @param {number} timestamp Unix timestamp in milliseconds.
 * @returns {string} Date key.
 */
export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Groups stickys by local day and orders both days and ids newest-first.
 * @param {Stickys} stickys Sticky map.
 * @returns {TimelineGroup[]} Day groups in display order.
 */
export function groupStickysByDay(stickys: Stickys): TimelineGroup[] {
  const entries = Object.keys(stickys).sort(
    (a, b) => getStickyTimestamp(b) - getStickyTimestamp(a),
  );
  const grouped = new Map<string, string[]>();

  entries.forEach((id) => {
    const day = getDateKey(getStickyTimestamp(id));
    const ids = grouped.get(day);
    if (ids) {
      ids.push(id);
    } else {
      grouped.set(day, [id]);
    }
  });

  return Array.from(grouped, ([day, ids]) => ({ day, ids }));
}
