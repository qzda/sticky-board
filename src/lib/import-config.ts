import {
  MAX_CARD_SIZE_REM,
  MAX_IMPORTED_COORDINATE_PX,
  MAX_IMPORTED_Z_INDEX,
  MIN_CARD_SIZE_REM,
} from "../constants";
import type { Sticky } from "./types";
import { isRecord } from "./validation";

/** One validated entry from sticky-board-config.json. */
export type ImportedConfigEntry = { path: string } & Record<string, unknown>;

/** Validated sticky-board-config.json entries keyed by sticky id. */
export type ImportedConfigMap = Record<string, ImportedConfigEntry>;

const IMPORT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const UNSAFE_CONFIG_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Parses a finite number from an unknown value.
 * @param {unknown} value Raw value.
 * @param {number} fallback Value used when parsing fails.
 * @returns {number} Finite number.
 */
export function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Clamps a number into an inclusive range.
 * @param {number} value Input value.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} Clamped value.
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes an imported layout entry.
 * Values are finite integers, sizes stay within the CSS card limits and
 * coordinates are non-negative and capped to a sane maximum.
 * @param {ImportedConfigEntry | undefined} cfg Imported config entry.
 * @param {Omit<Sticky, "text">} defaults Fallback layout.
 * @returns {Omit<Sticky, "text">} Normalized layout.
 */
export function normalizeImportedLayout(
  cfg: ImportedConfigEntry | undefined,
  defaults: Omit<Sticky, "text">,
): Omit<Sticky, "text"> {
  const source: Record<string, unknown> = cfg ?? {};
  return {
    x: clampNumber(
      Math.round(toFiniteNumber(source.x, defaults.x)),
      0,
      MAX_IMPORTED_COORDINATE_PX,
    ),
    y: clampNumber(
      Math.round(toFiniteNumber(source.y, defaults.y)),
      0,
      MAX_IMPORTED_COORDINATE_PX,
    ),
    width: clampNumber(
      Math.round(toFiniteNumber(source.width, defaults.width)),
      MIN_CARD_SIZE_REM,
      MAX_CARD_SIZE_REM,
    ),
    height: clampNumber(
      Math.round(toFiniteNumber(source.height, defaults.height)),
      MIN_CARD_SIZE_REM,
      MAX_CARD_SIZE_REM,
    ),
    zIndex: clampNumber(
      Math.round(toFiniteNumber(source.zIndex, defaults.zIndex)),
      1,
      MAX_IMPORTED_Z_INDEX,
    ),
  };
}

/**
 * Builds a validated sticky from an imported config and markdown text.
 * @param {ImportedConfigEntry | undefined} cfg Imported config entry.
 * @param {Omit<Sticky, "text">} defaults Fallback layout.
 * @param {unknown} text Imported markdown text.
 * @returns {Sticky} Normalized sticky.
 */
export function normalizeImportedSticky(
  cfg: ImportedConfigEntry | undefined,
  defaults: Omit<Sticky, "text">,
  text: unknown,
): Sticky {
  return {
    ...normalizeImportedLayout(cfg, defaults),
    text: typeof text === "string" ? text : "",
  };
}

/**
 * Validates parsed sticky-board-config.json content.
 * Entries with unsafe ids or a missing path are ignored.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {ImportedConfigMap} Validated config entries.
 */
export function parseImportedConfig(parsed: unknown): ImportedConfigMap {
  if (!isRecord(parsed)) return {};

  const config: ImportedConfigMap = Object.create(null) as ImportedConfigMap;
  Object.entries(parsed).forEach(([id, value]) => {
    if (UNSAFE_CONFIG_KEYS.has(id) || !IMPORT_ID_PATTERN.test(id)) return;
    if (!isRecord(value) || typeof value.path !== "string") return;
    config[id] = { ...value, path: value.path };
  });
  return config;
}
