/** Prefix used by internal image links. */
export const IMAGE_SRC_PREFIX = "sticky-image://";

const IMAGE_KEY_PATTERN = /!\[[^\]]*]\(sticky-image:\/\/([a-zA-Z0-9_-]+)\)/g;

/**
 * Extracts image keys referenced in markdown text.
 * @param {string} text Markdown text.
 * @returns {Set<string>} Referenced image key set.
 */
export function extractReferencedImageKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const match of text.matchAll(IMAGE_KEY_PATTERN)) {
    keys.add(match[1]);
  }
  return keys;
}

/**
 * Collects all referenced image keys across markdown texts.
 * @param {Iterable<string>} texts Markdown texts.
 * @returns {Set<string>} Global referenced image key set.
 */
export function collectReferencedImageKeys(
  texts: Iterable<string>,
): Set<string> {
  const allKeys = new Set<string>();
  for (const text of texts) {
    extractReferencedImageKeys(text).forEach((key) => allKeys.add(key));
  }
  return allKeys;
}
