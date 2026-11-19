import { IMAGE_SRC_PREFIX } from "./images";

/** Matches every markdown image and captures alt text and raw path. */
export const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Normalizes zip-relative paths for stable matching.
 * Backslashes become slashes, and `.` / `..` segments are resolved.
 * @param {string} path Raw path.
 * @returns {string} Normalized relative path without leading ./ or /.
 */
export function normalizeZipPath(path: string): string {
  const parts: string[] = [];

  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }

  return parts.join("/");
}

/**
 * Returns a file extension guess for a blob MIME type.
 * @param {Blob} blob Image blob.
 * @returns {string} File extension without dot.
 */
export function getBlobExtension(blob: Blob): string {
  const mime = blob.type.toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/bmp") return "bmp";
  if (mime === "image/avif") return "avif";
  return "bin";
}

/**
 * Returns whether an image path should be left untouched during ZIP import.
 * Remote URLs, data URLs and internal sticky-image links are not read from the zip.
 * @param {string} path Raw markdown image path.
 * @returns {boolean} True when the path is external or internal.
 */
export function isExternalImagePath(path: string): boolean {
  return (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith(IMAGE_SRC_PREFIX)
  );
}

/**
 * Resolves a markdown image path relative to its markdown file inside the zip.
 * @param {string} mdPath Markdown file path.
 * @param {string} rawPath Raw image path from markdown.
 * @returns {string} Normalized zip path.
 */
export function resolveZipImagePath(mdPath: string, rawPath: string): string {
  const mdDir = normalizeZipPath(mdPath).split("/").slice(0, -1).join("/");
  const combined = mdDir ? `${mdDir}/${rawPath}` : rawPath;
  return normalizeZipPath(combined);
}

/**
 * Rewrites sticky-image links to relative image paths for zip export.
 * @param {string} text Markdown text.
 * @param {Record<string, string>} imagePathByKey Image path map by key.
 * @returns {string} Rewritten markdown.
 */
export function toZipMarkdown(
  text: string,
  imagePathByKey: Record<string, string>,
): string {
  return text.replace(MARKDOWN_IMAGE_PATTERN, (full, alt, rawPath) => {
    const path = String(rawPath).trim();
    if (!path.startsWith(IMAGE_SRC_PREFIX)) return full;
    const imageKey = path.slice(IMAGE_SRC_PREFIX.length);
    const mapped = imagePathByKey[imageKey];
    if (!mapped) return full;
    return `![${alt}](${mapped})`;
  });
}
