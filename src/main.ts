import interact from "interactjs";
import MarkdownIt from "markdown-it";
import JSZip from "jszip";

import settings from "./assets/settings.svg?raw";
import layout from "./assets/layout.svg?raw";
import download from "./assets/download.svg?raw";
import upload from "./assets/upload.svg?raw";
import github from "./assets/github.svg?raw";
import copyIcon from "./assets/LucideCopy.svg?raw";
import copyCheckIcon from "./assets/LucideCopyCheck.svg?raw";
import closeIcon from "./assets/LucideX.svg?raw";
import maximizeIcon from "./assets/LucideMaximize.svg?raw";
import minimizeIcon from "./assets/LucideMinimize.svg?raw";
import editIcon from "./assets/LucideSquarePen.svg?raw";
import previewIcon from "./assets/LucideEye.svg?raw";
import leavesVideo from "./assets/leaves.mp4";

/**
 * Detects UI language from browser locale.
 * @returns {"zh" | "en"} Language code used by this app.
 */
function getLanguage(): "zh" | "en" {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("zh") ? "zh" : "en";
}

const texts = {
  zh: {
    deleteConfirm: "确定要删除这个便签吗？",
    invalidFormat: "无效的文件格式",
    imageTooLarge: "图片超过 20MB，无法粘贴",
    importConfirm: (importCount: number, existingIds: number, newIds: number) =>
      `发现 ${importCount} 个便签：\n- ${existingIds} 个现有便签将被更新\n- ${newIds} 个新便签将被添加\n\n继续？`,
    parseFailed: "解析 JSON 文件失败",
    sunnyTheme: "Sunny",
    layoutMode: "时间轴布局",
    exportLabel: "导出",
    importLabel: "导入",
    timelineHint: "双击任意便签可退出时间线，并将该便签置顶后居中显示",
    copyCode: "复制代码",
    copiedCode: "已复制",
    deleteLabel: "删除便签",
    maximizeLabel: "最大化",
    restoreLabel: "还原",
    editLabel: "编辑",
    previewLabel: "预览",
    defaultText:
      "## Hi naonao\n- 右键卡片进入编辑模式，按 Esc 退出编辑\n- 点击顶栏按钮可切换编辑/预览\n- 点击页面空白处预览\n- 按住顶部移动位置\n- 按住右下角调整大小\n- 点击右上角按钮可最大化/还原便签\n- 代码块右上角支持一键复制\n- 支持粘贴图片（单张不超过 20MB）",
  },
  en: {
    deleteConfirm: "Are you sure you want to delete this note?",
    invalidFormat: "Invalid file format",
    imageTooLarge: "Image is larger than 20MB and cannot be pasted",
    importConfirm: (importCount: number, existingIds: number, newIds: number) =>
      `Found ${importCount} note(s):\n- ${existingIds} existing note(s) will be updated\n- ${newIds} new note(s) will be added\n\nContinue?`,
    parseFailed: "Failed to parse JSON file",
    sunnyTheme: "Sunny",
    layoutMode: "Timeline layout",
    exportLabel: "Export",
    importLabel: "Import",
    timelineHint:
      "Double-click any note to exit timeline, then bring it to front and center it",
    copyCode: "Copy code",
    copiedCode: "Copied",
    deleteLabel: "Delete note",
    maximizeLabel: "Maximize",
    restoreLabel: "Restore",
    editLabel: "Edit",
    previewLabel: "Preview",
    defaultText:
      "## Hi naonao\n- Right-click a card to edit, press Esc to exit editing\n- Use the top-bar button to switch between edit and preview\n- Click any empty area to preview\n- Drag the top area to move the card\n- Drag the bottom-right corner to resize\n- Use the top-right button to maximize/restore the note\n- Code blocks have a one-click copy button\n- Paste image is supported (up to 20MB each)",
  },
};

const t = texts[getLanguage()];

type Stickys = Record<string, Sticky>;

type Sticky = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
};

type CardGeometry = Pick<Sticky, "x" | "y" | "width" | "height" | "zIndex">;

/**
 * Checks whether a value is a plain object record.
 * @param {unknown} value The value to validate.
 * @returns {value is Record<string, unknown>} True when value is a non-null object and not an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns a required DOM element, throwing a descriptive error when missing.
 * @template T
 * @param {string} selector CSS selector.
 * @returns {T} Matching element.
 */
function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

const defaultText = t.defaultText;
const IMAGE_SRC_PREFIX = "sticky-image://";
const IMAGE_KEY_PATTERN = /!\[[^\]]*]\(sticky-image:\/\/([a-zA-Z0-9_-]+)\)/g;
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;
const SUNNY_THEME_STORAGE_KEY = "sunnyThemeEnabled";
const DB_NAME = "sticky-board-db";
const DB_VERSION = 1;
const DB_STORE = "app-state";
const DB_KEY_STICKYS = "stickys";
const DB_KEY_IMAGES = "stickyImages";

type PersistRecord = {
  key: string;
  value: unknown;
};

type StickyConfigEntry = Omit<Sticky, "text"> & { path: string };
type StickyConfigMap = Record<string, StickyConfigEntry>;

let stickys: Stickys = {};
let imageStore: Record<string, Blob> = {};
const imageUrlCache = new Map<string, string>();
const cardElementMap = new Map<string, HTMLDivElement>();
const PERSIST_DEBOUNCE_MS = 300;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens the IndexedDB database and creates stores on first run.
 * The connection is cached and reused by later transactions.
 * @returns {Promise<IDBDatabase>} Open database handle.
 */
function openAppDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Reads a value by key from app state store.
 * @template T
 * @param {string} key Storage key.
 * @returns {Promise<T | undefined>} Stored value, or undefined if key is missing.
 */
async function readPersistedValue<T>(key: string): Promise<T | undefined> {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const row = request.result as PersistRecord | undefined;
      resolve((row?.value as T | undefined) ?? undefined);
    };
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Writes a key/value pair to app state store.
 * @param {string} key Storage key.
 * @param {unknown} value Value to persist.
 * @returns {Promise<void>}
 */
async function writePersistedValue(key: string, value: unknown): Promise<void> {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.put({ key, value } as PersistRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Persists current stickys map to IndexedDB.
 * @returns {Promise<void>}
 */
async function persistStickys(): Promise<void> {
  await writePersistedValue(DB_KEY_STICKYS, stickys);
}

/**
 * Persists current image store to IndexedDB.
 * @returns {Promise<void>}
 */
async function persistImageStore(): Promise<void> {
  await writePersistedValue(DB_KEY_IMAGES, imageStore);
}

let persistStickysTimer: number | null = null;

/**
 * Schedules a debounced write of the stickys map.
 * Geometry and text updates can fire many times per second, so writes are coalesced.
 * @returns {void}
 */
function schedulePersistStickys(): void {
  if (persistStickysTimer !== null) {
    window.clearTimeout(persistStickysTimer);
  }

  persistStickysTimer = window.setTimeout(() => {
    persistStickysTimer = null;
    void persistStickys().catch((error) => {
      console.error("[storage] failed to persist stickys", error);
    });
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Cancels a pending debounced write without persisting.
 * Used before an explicit awaited write (for example ZIP import).
 * @returns {void}
 */
function cancelScheduledPersistStickys(): void {
  if (persistStickysTimer === null) return;
  window.clearTimeout(persistStickysTimer);
  persistStickysTimer = null;
}

/**
 * Writes stickys immediately when a debounced write is pending.
 * @returns {void}
 */
function flushPersistStickys(): void {
  if (persistStickysTimer === null) return;
  cancelScheduledPersistStickys();
  void persistStickys().catch((error) => {
    console.error("[storage] failed to persist stickys", error);
  });
}

/**
 * Revokes a cached object URL for an image key.
 * @param {string} key Image key.
 * @returns {void}
 */
function revokeImageUrl(key: string): void {
  const cached = imageUrlCache.get(key);
  if (!cached) return;
  URL.revokeObjectURL(cached);
  imageUrlCache.delete(key);
}

/**
 * Revokes all cached object URLs.
 * @returns {void}
 */
function revokeAllImageUrls(): void {
  imageUrlCache.forEach((url) => URL.revokeObjectURL(url));
  imageUrlCache.clear();
}

/**
 * Converts a data URL string to Blob.
 * @param {string} dataUrl Data URL to decode.
 * @returns {Blob} Decoded blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0 || !dataUrl.startsWith("data:")) {
    throw new Error("Invalid data URL");
  }

  const meta = dataUrl.slice(5, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const mime = meta.split(";")[0] || "application/octet-stream";
  const isBase64 = meta.includes(";base64");
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Normalizes heterogeneous image map values into Blob values.
 * @param {Record<string, unknown>} source Raw image map.
 * @returns {Promise<Record<string, Blob>>} Normalized image map.
 */
async function normalizeImageMap(
  source: Record<string, unknown>,
): Promise<Record<string, Blob>> {
  const normalized: Record<string, Blob> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.length === 0) continue;
    if (value instanceof Blob) {
      normalized[key] = value;
      continue;
    }
    if (typeof value === "string" && value.startsWith("data:")) {
      try {
        normalized[key] = dataUrlToBlob(value);
      } catch (error) {
        console.warn(`[storage] invalid image data for key: ${key}`, error);
      }
    }
  }
  return normalized;
}

/**
 * Returns cached object URL for a blob, creating one if needed.
 * @param {string} key Image key.
 * @param {Blob} blob Image blob.
 * @returns {string} Object URL for rendering.
 */
function getImageObjectUrl(key: string, blob: Blob): string {
  const cached = imageUrlCache.get(key);
  if (cached) return cached;
  const objectUrl = URL.createObjectURL(blob);
  imageUrlCache.set(key, objectUrl);
  return objectUrl;
}

/**
 * Requests persistent storage from browser.
 * @returns {Promise<void>}
 */
async function requestPersistentStorage(): Promise<void> {
  if (!("storage" in navigator) || !navigator.storage.persist) {
    console.log("[storage] persistent storage API not available");
    return;
  }
  try {
    const granted = await navigator.storage.persist();
    console.log(
      `[storage] persistent storage request: ${granted ? "granted" : "not granted"}`,
    );
  } catch (error) {
    console.warn("[storage] persistent storage request failed", error);
  }
}

/**
 * Loads app state from IndexedDB into in-memory state.
 * @returns {Promise<void>}
 */
async function loadStateFromIndexedDb(): Promise<void> {
  const loadedStickys = await readPersistedValue<Stickys>(DB_KEY_STICKYS);
  const loadedImagesRaw =
    await readPersistedValue<Record<string, unknown>>(DB_KEY_IMAGES);

  stickys = loadedStickys && isRecord(loadedStickys) ? loadedStickys : {};
  imageStore =
    loadedImagesRaw && isRecord(loadedImagesRaw)
      ? await normalizeImageMap(loadedImagesRaw)
      : {};
}

/**
 * Updates a sticky in memory and schedules a debounced persistence.
 * @param {string} id Sticky id.
 * @param {Partial<Sticky>} data Partial sticky patch.
 * @returns {void}
 */
function updateSticky(id: string, data: Partial<Sticky>): void {
  stickys[id] = {
    ...stickys[id],
    ...data,
  };
  schedulePersistStickys();
}

/**
 * Projects geometry from the model onto a card element.
 * @param {HTMLElement} card Card element.
 * @param {CardGeometry} geometry Geometry to apply.
 * @returns {void}
 */
function applyCardGeometry(card: HTMLElement, geometry: CardGeometry): void {
  card.style.width = `${geometry.width}rem`;
  card.style.height = `${geometry.height}rem`;
  card.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
  card.style.zIndex = `${geometry.zIndex}`;
}

/**
 * Updates geometry in the model and projects it onto the card.
 * The sticky model stays the single source of truth; the DOM is only a view.
 * @param {HTMLElement} card Card element.
 * @param {Partial<CardGeometry>} patch Geometry fields to change.
 * @returns {void}
 */
function commitCardGeometry(
  card: HTMLElement,
  patch: Partial<CardGeometry>,
): void {
  const sticky = stickys[card.id];
  if (!sticky) return;

  applyCardGeometry(card, { ...sticky, ...patch });
  updateSticky(card.id, patch);
}

/**
 * Returns whether a card is currently in edit mode.
 * @param {HTMLElement} card Card element.
 * @returns {boolean} True when the textarea is visible.
 */
function isCardEditing(card: HTMLElement): boolean {
  const textarea = card.querySelector("textarea");
  return textarea ? textarea.style.display !== "none" : false;
}

/**
 * Returns whether the timeline layout mode is active.
 * @returns {boolean} True when the timeline layout class is on the body.
 */
function isTimelineLayout(): boolean {
  return document.body.classList.contains("layout-timeline");
}

/**
 * Deletes a sticky card and schedules persistence.
 * @param {string} id Sticky id.
 * @returns {void}
 */
function deleteCard(id: string): void {
  delete stickys[id];
  cardElementMap.delete(id);
  cleanupUnusedImages();
  schedulePersistStickys();
}

const MAX_PASTED_IMAGE_SIZE = 20 * 1024 * 1024;

/**
 * Schedules image store persistence.
 * @returns {void}
 */
function saveImageStore(): void {
  void persistImageStore().catch((error) => {
    console.error("[storage] failed to persist images", error);
  });
}

/**
 * Builds an image key namespaced by sticky id.
 * @param {string} stickyId Sticky id.
 * @returns {string} Image key in format: [stickyID]-[imageID].
 */
function createImageKey(stickyId: string): string {
  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stickyId}-${imageId}`;
}

/**
 * Normalizes zip-relative paths for stable matching.
 * @param {string} path Raw path.
 * @returns {string} Normalized relative path without leading ./ or /.
 */
function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}

/**
 * Returns a file extension guess for a blob MIME type.
 * @param {Blob} blob Image blob.
 * @returns {string} File extension without dot.
 */
function getBlobExtension(blob: Blob): string {
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
 * Rewrites sticky-image links to relative image paths for zip export.
 * @param {string} text Markdown text.
 * @param {Record<string, string>} imagePathByKey Image path map by key.
 * @returns {string} Rewritten markdown.
 */
function toZipMarkdown(
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

/**
 * Rewrites relative markdown image paths from zip into sticky-image links.
 * If image file is not found in zip, keeps original path unchanged.
 * @param {string} text Markdown text.
 * @param {string} mdPath Markdown file path in zip.
 * @param {JSZip} zip Zip archive.
 * @param {string} stickyId Sticky id for generated image keys.
 * @returns {Promise<{ text: string; images: Record<string, Blob> }>} Rewritten text and imported images.
 */
async function fromZipMarkdown(
  text: string,
  mdPath: string,
  zip: JSZip,
  stickyId: string,
): Promise<{ text: string; images: Record<string, Blob> }> {
  const importedImages: Record<string, Blob> = {};
  const mdDir = normalizeZipPath(mdPath).split("/").slice(0, -1).join("/");
  let rewritten = text;
  let localSeq = 0;
  const matches = [...text.matchAll(MARKDOWN_IMAGE_PATTERN)];
  for (const match of matches) {
    const full = match[0];
    const alt = match[1];
    const rawPath = match[2].trim();
    if (
      rawPath.startsWith("http://") ||
      rawPath.startsWith("https://") ||
      rawPath.startsWith("data:") ||
      rawPath.startsWith(IMAGE_SRC_PREFIX)
    ) {
      continue;
    }

    const combined = mdDir ? `${mdDir}/${rawPath}` : rawPath;
    const resolvedPath = normalizeZipPath(combined);
    const zipFile = zip.file(resolvedPath);
    if (!zipFile) continue;

    const imageBlob = await zipFile.async("blob");
    const imageKey = `${createImageKey(stickyId)}-${localSeq++}`;
    importedImages[imageKey] = imageBlob;
    rewritten = rewritten.replace(full, `![${alt}](${IMAGE_SRC_PREFIX}${imageKey})`);
  }
  return {
    text: rewritten,
    images: importedImages,
  };
}

/**
 * Extracts image keys referenced in markdown text.
 * @param {string} text Markdown text.
 * @returns {Set<string>} Referenced image key set.
 */
function extractReferencedImageKeys(text: string): Set<string> {
  const keys = new Set<string>();
  IMAGE_KEY_PATTERN.lastIndex = 0;
  let match = IMAGE_KEY_PATTERN.exec(text);
  while (match) {
    keys.add(match[1]);
    match = IMAGE_KEY_PATTERN.exec(text);
  }
  return keys;
}

/**
 * Collects all referenced image keys across all stickys.
 * @returns {Set<string>} Global referenced image key set.
 */
function getAllReferencedImageKeys(): Set<string> {
  const allKeys = new Set<string>();
  Object.values(stickys).forEach((sticky) => {
    const keys = extractReferencedImageKeys(sticky.text || "");
    keys.forEach((key) => allKeys.add(key));
  });
  return allKeys;
}

/**
 * Removes unreferenced images from store and persists changes.
 * @returns {void}
 */
function cleanupUnusedImages(): void {
  const referencedKeys = getAllReferencedImageKeys();
  let changed = false;

  Object.keys(imageStore).forEach((key) => {
    if (!referencedKeys.has(key)) {
      revokeImageUrl(key);
      delete imageStore[key];
      changed = true;
    }
  });

  if (changed) {
    saveImageStore();
  }
}

/**
 * Reads sunny theme setting from localStorage.
 * @returns {boolean} Whether sunny theme should be enabled.
 */
function getSunnyThemeEnabled(): boolean {
  const stored = localStorage.getItem(SUNNY_THEME_STORAGE_KEY);
  if (stored === null) return false;
  return stored === "1";
}

/**
 * Toggles sunny theme and syncs background video playback.
 * @param {boolean} enabled Whether sunny theme is enabled.
 * @returns {void}
 */
function applySunnyTheme(enabled: boolean): void {
  document.body.classList.toggle("sunny-theme", enabled);
  if (enabled) {
    ensureSunnyVideoOverlay();
  }
  syncSunnyVideoPlayback();
}

/**
 * Starts or pauses sunny video depending on visibility and setting.
 * @returns {void}
 */
function syncSunnyVideoPlayback(): void {
  if (!sunnyVideoElement) return;

  const enabled = document.body.classList.contains("sunny-theme");
  if (enabled && document.visibilityState === "visible") {
    sunnyVideoElement.play().catch(() => {});
    return;
  }

  sunnyVideoElement.pause();
}

let imagePreviewOverlay: HTMLDivElement | null = null;
let imagePreviewElement: HTMLImageElement | null = null;
let sunnyVideoOverlay: HTMLDivElement | null = null;
let sunnyVideoElement: HTMLVideoElement | null = null;

/**
 * Lazily creates sunny video overlay.
 * @returns {void}
 */
function ensureSunnyVideoOverlay(): void {
  if (sunnyVideoOverlay && sunnyVideoElement) return;

  sunnyVideoOverlay = document.createElement("div");
  sunnyVideoOverlay.className = "sunny-video-overlay";

  sunnyVideoElement = document.createElement("video");
  sunnyVideoElement.className = "sunny-video";
  sunnyVideoElement.src = leavesVideo;
  sunnyVideoElement.autoplay = true;
  sunnyVideoElement.muted = true;
  sunnyVideoElement.loop = true;
  sunnyVideoElement.playsInline = true;
  sunnyVideoElement.preload = "metadata";

  sunnyVideoOverlay.appendChild(sunnyVideoElement);
  document.body.appendChild(sunnyVideoOverlay);

  syncSunnyVideoPlayback();
}

/**
 * Lazily creates image preview overlay.
 * @returns {void}
 */
function ensureImagePreviewOverlay(): void {
  if (imagePreviewOverlay && imagePreviewElement) return;

  imagePreviewOverlay = document.createElement("div");
  imagePreviewOverlay.className = "image-preview-overlay";

  imagePreviewElement = document.createElement("img");
  imagePreviewElement.className = "image-preview-image";

  imagePreviewOverlay.appendChild(imagePreviewElement);
  imagePreviewOverlay.addEventListener("click", (e) => {
    if (e.target === imagePreviewOverlay) {
      imagePreviewOverlay?.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      imagePreviewOverlay?.classList.remove("open");
    }
  });

  document.body.appendChild(imagePreviewOverlay);
}

/**
 * Opens image preview modal.
 * @param {string} src Image source URL.
 * @param {string} [alt=""] Image alt text.
 * @returns {void}
 */
function openImagePreview(src: string, alt: string = ""): void {
  ensureImagePreviewOverlay();
  if (!imagePreviewOverlay || !imagePreviewElement) return;

  imagePreviewElement.src = src;
  imagePreviewElement.alt = alt;
  imagePreviewOverlay.classList.add("open");
}

const md = new MarkdownIt({
  html: true,
  linkify: true, // 自动识别 URL
  breaks: true, // 换行转 <br>
});

md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];

  const targetIndex = token.attrIndex("target");
  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![targetIndex][1] = "_blank";
  }

  const relIndex = token.attrIndex("rel");
  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    token.attrs![relIndex][1] = "noopener noreferrer";
  }

  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.image = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
  const src = token.attrGet("src");

  if (src?.startsWith(IMAGE_SRC_PREFIX)) {
    const key = src.slice(IMAGE_SRC_PREFIX.length);
    const imageData = imageStore[key];

    if (imageData) {
      token.attrSet("src", getImageObjectUrl(key, imageData));
    } else {
      token.attrSet("alt", "[missing image]");
    }
  }

  return self.renderToken(tokens, idx, options);
};

/**
 * Renders one code block wrapped with a copy button.
 * @param {string} content Raw code text.
 * @param {string} langName Language name from fence info, may be empty.
 * @returns {string} HTML for the code block.
 */
function renderCodeBlock(content: string, langName: string): string {
  const escapedCode = md.utils.escapeHtml(content);
  const classAttr = langName
    ? ` class="language-${md.utils.escapeHtml(langName)}"`
    : "";

  return (
    `<div class="code-block">` +
    `<button type="button" class="copy-code-btn" title="${t.copyCode}" ` +
    `aria-label="${t.copyCode}">${copyIcon}</button>` +
    `<pre><code${classAttr}>${escapedCode}</code></pre>` +
    `</div>`
  );
}

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const langName = token.info ? token.info.trim().split(/\s+/g)[0] : "";
  return renderCodeBlock(token.content, langName ?? "");
};

md.renderer.rules.code_block = (tokens, idx) => {
  const token = tokens[idx];
  return renderCodeBlock(token.content, "");
};

/**
 * Renders markdown text to HTML.
 * @param {string} text Markdown source.
 * @returns {string} Rendered HTML.
 */
function textToHtml(text: string): string {
  return md.render(text);
}

const copyResetTimers = new WeakMap<HTMLButtonElement, number>();

/**
 * Copies text to clipboard, falling back to a temporary textarea.
 * @param {string} text Text to copy.
 * @returns {Promise<boolean>} Whether copying succeeded.
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API unavailable, using fallback copy", error);
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.top = "-1000px";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  } catch (error) {
    console.warn("Copy failed", error);
    return false;
  }
}

/**
 * Copies the code block content and plays the copied state animation.
 * @param {HTMLButtonElement} button Copy button inside a `.code-block`.
 * @returns {Promise<void>}
 */
async function handleCopyCodeClick(button: HTMLButtonElement): Promise<void> {
  const code = button.closest(".code-block")?.querySelector("pre code");
  const copied = await copyTextToClipboard(code?.textContent ?? "");
  if (!copied) return;

  const existingTimer = copyResetTimers.get(button);
  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }

  button.classList.add("copied");
  button.innerHTML = copyCheckIcon;
  button.setAttribute("title", t.copiedCode);
  button.setAttribute("aria-label", t.copiedCode);

  const timer = window.setTimeout(() => {
    button.classList.remove("copied");
    button.innerHTML = copyIcon;
    button.setAttribute("title", t.copyCode);
    button.setAttribute("aria-label", t.copyCode);
    copyResetTimers.delete(button);
  }, 1500);

  copyResetTimers.set(button, timer);
}

/**
 * Checks whether card dragging and resizing are disabled.
 * @param {HTMLElement} card Card element.
 * @returns {boolean} Whether the card is docked or maximized.
 */
function isCardTransformLocked(card: HTMLElement): boolean {
  return isTimelineLayout() || card.classList.contains("card-maximized");
}

/**
 * Animates a card from a previously measured rect to its current layout (FLIP).
 * @param {HTMLElement} card Card element.
 * @param {DOMRect} previous Rect measured before the layout change.
 * @returns {void}
 */
function animateFlipFrom(card: HTMLElement, previous: DOMRect): void {
  const current = card.getBoundingClientRect();
  const dx = previous.left - current.left;
  const dy = previous.top - current.top;

  // 强制回流，让后续位移过渡有明确的起点
  void card.offsetWidth;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    card.style.transition = "";
    return;
  }

  card.style.translate = `${dx}px ${dy}px`;

  requestAnimationFrame(() => {
    card.style.transition = "";
    card.style.translate = "0px 0px";
  });
}

/**
 * Toggles the maximized state of one card and syncs its action button.
 * @param {HTMLElement} card Card element.
 * @param {boolean} maximized Whether the card should fill the viewport.
 * @returns {void}
 */
function setCardMaximized(card: HTMLElement, maximized: boolean): void {
  if (maximized) {
    document
      .querySelectorAll<HTMLElement>(".card.card-maximized")
      .forEach((other) => {
        if (other !== card) setCardMaximized(other, false);
      });
  }

  if (card.classList.contains("layout-docked")) {
    animateDockedMaximize(card, maximized);
  } else {
    card.classList.toggle("card-maximized", maximized);
  }

  const button = card.querySelector<HTMLButtonElement>(".card-maximize-btn");
  if (!button) return;

  const label = maximized ? t.restoreLabel : t.maximizeLabel;
  button.innerHTML = maximized ? minimizeIcon : maximizeIcon;
  button.title = label;
  button.setAttribute("aria-label", label);
}

/**
 * Toggles maximize for a flow-positioned (timeline) card with a FLIP offset.
 *
 * Docked cards use `position: relative` and `transform: none !important`, so the
 * `position` switch to `fixed` cannot be transitioned and the card would otherwise
 * snap to the viewport corner. The offset is applied through `translate`, which is
 * independent of `transform`, while width/height keep their normal CSS transition.
 * @param {HTMLElement} card Card element.
 * @param {boolean} maximized Whether the card should fill the viewport.
 * @returns {void}
 */
function animateDockedMaximize(
  card: HTMLElement,
  maximized: boolean,
): void {
  const before = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  const duration = style.transitionDuration.split(",")[0].trim();
  const easing = style.transitionTimingFunction.split(",")[0].trim();
  const sizeTransition = ["width", "height", "max-width", "max-height"]
    .map((property) => `${property} ${duration} ${easing}`)
    .join(", ");

  // 先只保留尺寸过渡，让位置补偿立即生效
  card.style.transition = sizeTransition;
  card.classList.toggle("card-maximized", maximized);
  animateFlipFrom(card, before);
}

/**
 * Syncs the top-bar edit/preview button with the card's current mode.
 * Shows the edit icon while previewing and the eye icon while editing.
 * @param {HTMLElement} card Card element.
 * @returns {void}
 */
function syncEditToggleButton(card: HTMLElement): void {
  const button = card.querySelector<HTMLButtonElement>(".card-edit-btn");
  if (!button) return;

  const isEditing = isCardEditing(card);
  const label = isEditing ? t.previewLabel : t.editLabel;

  button.innerHTML = isEditing ? previewIcon : editIcon;
  button.title = label;
  button.setAttribute("aria-label", label);
}

/**
 * Applies edit or preview mode to one card.
 * @param {HTMLElement} card Card element.
 * @param {boolean} isEditing Whether to switch into edit mode.
 * @returns {void}
 */
function setCardEditing(card: HTMLElement, isEditing: boolean): void {
  const textarea = card.querySelector<HTMLTextAreaElement>("textarea");
  const preview = card.querySelector<HTMLDivElement>(".preview");
  if (!textarea || !preview) return;

  textarea.style.display = isEditing ? "block" : "none";
  preview.style.display = isEditing ? "none" : "block";
  if (!isEditing) {
    preview.innerHTML = textToHtml(textarea.value);
  }

  syncEditToggleButton(card);

  if (isEditing) {
    window.setTimeout(() => {
      textarea.focus();
    }, 200);
  }
}

/**
 * Switches one card between edit and preview mode.
 * @param {HTMLElement} card Card element.
 * @param {boolean} isEditing Whether to switch into edit mode.
 * @returns {void}
 */
function toggleEditMode(card: HTMLElement, isEditing: boolean): void {
  window.setTimeout(() => setCardEditing(card, isEditing));
}

/**
 * Switches all cards to preview mode.
 * @returns {void}
 */
function toggleAllToPreview(): void {
  const cards = document.querySelectorAll<HTMLDivElement>(".card");
  cards.forEach((card) => {
    if (!isCardEditing(card)) return;
    setCardEditing(card, false);
  });
}

type CardActionOptions = {
  className: string;
  label: string;
  icon: string;
  onClick: () => void;
};

/**
 * Creates a top-bar action button for a card.
 * @param {CardActionOptions} options Button options.
 * @returns {HTMLButtonElement} Action button.
 */
function createCardAction(options: CardActionOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `card-action-btn ${options.className}`;
  button.title = options.label;
  button.setAttribute("aria-label", options.label);
  button.innerHTML = options.icon;
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    options.onClick();
  });
  return button;
}

/**
 * Creates a sticky card DOM node and wires interactions.
 * @param {string} id Sticky id.
 * @param {Partial<Sticky>} data Initial sticky data.
 * @param {boolean} isEditing Whether card starts in edit mode.
 * @returns {HTMLDivElement} Card element.
 */
function createCard(
  id: string,
  data: Partial<Sticky>,
  isEditing: boolean,
): HTMLDivElement {
  const {
    zIndex = getMaxZIndex(),
    width = 20,
    height = 10,
    x = 0,
    y = 0,
    text = defaultText,
  } = data;

  const card = document.createElement("div");
  card.className = "card";
  card.id = id;
  card.style.position = "absolute";
  applyCardGeometry(card, { x, y, width, height, zIndex });
  cardElementMap.set(id, card);

  const resizeBtn = document.createElement("div");
  resizeBtn.className = "resize";

  // 创建右上角操作区（编辑/预览、最大化/还原、删除）
  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = createCardAction({
    className: "card-edit-btn",
    label: t.editLabel,
    icon: editIcon,
    onClick: () => toggleEditMode(card, !isCardEditing(card)),
  });

  const maximizeBtn = createCardAction({
    className: "card-maximize-btn",
    label: t.maximizeLabel,
    icon: maximizeIcon,
    onClick: () =>
      setCardMaximized(card, !card.classList.contains("card-maximized")),
  });

  const deleteBtn = createCardAction({
    className: "card-close-btn",
    label: t.deleteLabel,
    icon: closeIcon,
    onClick: () => {
      if (!confirm(t.deleteConfirm)) return;
      deleteCard(id);
      card.remove();
      if (isTimelineLayout()) {
        renderTimelineLayout();
      }
    },
  });

  actions.appendChild(editBtn);
  actions.appendChild(maximizeBtn);
  actions.appendChild(deleteBtn);

  // 创建 textarea
  const textarea = document.createElement("textarea");
  textarea.id = `${id}-input`;
  textarea.value = text;
  textarea.addEventListener("input", (e) => {
    const target = e.target as HTMLTextAreaElement;
    updateSticky(id, { text: target.value });
  });
  textarea.addEventListener("paste", async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItem = Array.from(items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    e.preventDefault();

    if (file.size > MAX_PASTED_IMAGE_SIZE) {
      alert(t.imageTooLarge);
      return;
    }

    try {
      const imageKey = createImageKey(id);
      imageStore[imageKey] = file;
      saveImageStore();

      const markdownImage = `\n![pasted-image](${IMAGE_SRC_PREFIX}${imageKey})\n`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      textarea.setRangeText(markdownImage, start, end, "end");
      updateSticky(id, { text: textarea.value });
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      console.error(error);
    }
  });

  // 创建预览区域
  const preview = document.createElement("div");
  preview.className = "preview";
  preview.innerHTML = textToHtml(textarea.value);
  preview.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const copyButton = target.closest<HTMLButtonElement>(".copy-code-btn");

    if (copyButton) {
      e.preventDefault();
      e.stopPropagation();
      void handleCopyCodeClick(copyButton);
      return;
    }

    if (target.tagName !== "IMG") return;
    e.stopPropagation();
    const image = target as HTMLImageElement;
    openImagePreview(image.currentSrc || image.src, image.alt);
  });

  card.addEventListener("contextmenu", (e) => {
    if (isTimelineLayout()) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".resize")) return;

    const isEditing = isCardEditing(card);
    if (isEditing) return;

    e.preventDefault();
    e.stopPropagation();
    toggleEditMode(card, true);
  });
  card.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    bringCardToFront(card);
  });
  card.addEventListener("dblclick", (e) => {
    if (!isTimelineLayout()) return;
    e.preventDefault();
    e.stopPropagation();
    setLayoutMode(false);
    bringCardToFront(card);
    moveCardToViewportCenter(card);
  });

  card.appendChild(actions);
  card.appendChild(resizeBtn);
  card.appendChild(textarea);
  card.appendChild(preview);

  toggleEditMode(card, isEditing);

  // 保存初始状态
  updateSticky(id, {
    zIndex,
    width,
    height,
    x,
    y,
    text,
  });

  return card;
}

const grid = getRequiredElement<HTMLDivElement>("#root");

let isDraggingToCreate = false;
let startX = 0;
let startY = 0;
let shadowDiv: HTMLDivElement | null = null;

function setCreateSelectingLocked(locked: boolean): void {
  const value = locked ? "none" : "";
  document.body.style.userSelect = value;
  document.documentElement.style.userSelect = value;
}

function finishCreateDragging(): void {
  if (shadowDiv) {
    grid.removeChild(shadowDiv);
    shadowDiv = null;
  }
  isDraggingToCreate = false;
  setCreateSelectingLocked(false);
}

// 监听鼠标按下事件，开始准备创建
grid.addEventListener("mousedown", (e) => {
  if (isTimelineLayout()) return;
  // 只在直接点击 grid 时创建，不在卡片上创建
  if (e.target === grid) {
    isDraggingToCreate = true;
    startX = e.clientX;
    startY = e.clientY;
    setCreateSelectingLocked(true);
  }
});

// 监听鼠标移动事件，显示阴影
grid.addEventListener("mousemove", (e) => {
  if (isTimelineLayout()) return;
  if (isDraggingToCreate) {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // 只有移动距离足够时才显示阴影
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      if (!shadowDiv) {
        shadowDiv = document.createElement("div");
        shadowDiv.style.position = "absolute";
        shadowDiv.style.border = "2px dashed gray";
        shadowDiv.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
        shadowDiv.style.pointerEvents = "none";
        shadowDiv.style.zIndex = "1000";
        grid.appendChild(shadowDiv);
      }

      // 计算阴影的位置和大小
      const left = Math.min(startX, e.clientX);
      const top = Math.min(startY, e.clientY);
      const width = Math.abs(deltaX);
      const height = Math.abs(deltaY);

      // 对齐到网格，但不设置最小值
      const gridLeft = Math.round(left / 16) * 16;
      const gridTop = Math.round(top / 16) * 16;
      const gridWidth = Math.round(width / 16) * 16;
      const gridHeight = Math.round(height / 16) * 16;

      shadowDiv.style.left = `${gridLeft}px`;
      shadowDiv.style.top = `${gridTop}px`;
      shadowDiv.style.width = `${gridWidth}px`;
      shadowDiv.style.height = `${gridHeight}px`;
    }
  }
});

// 监听鼠标释放事件，创建卡片
grid.addEventListener("mouseup", () => {
  if (isTimelineLayout()) return;
  if (isDraggingToCreate) {
    // 只有在范围足够大时才创建卡片
    // 要求宽度和高度都至少达到 160px (10rem)
    if (shadowDiv) {
      const width = parseInt(shadowDiv.style.width);
      const height = parseInt(shadowDiv.style.height);

      if (width >= 160 && height >= 160) {
        // 获取阴影的位置和大小
        const left = parseInt(shadowDiv.style.left);
        const top = parseInt(shadowDiv.style.top);
        const widthRem = (width / 16) >> 0; // 转换为rem
        const heightRem = (height / 16) >> 0;

        // 创建实际的卡片
        const card = createCard(
          `${Date.now()}`,
          {
            x: left,
            y: top,
            width: widthRem,
            height: heightRem,
          },
          true,
        );

        grid.appendChild(card);
      }
      // 如果过小，直接取消，不创建卡片
    }

    finishCreateDragging();
  }
});

window.addEventListener("mouseup", () => {
  if (isTimelineLayout()) return;
  if (!isDraggingToCreate) return;
  finishCreateDragging();
});

// 点击 body 空白处，切换所有卡片到预览模式
document.body.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const selection = window.getSelection();
  const hasTextSelection = Boolean(selection && selection.toString().length > 0);
  if (hasTextSelection && selection) {
    const anchorNode = selection.anchorNode;
    const selectedCard = anchorNode
      ? (anchorNode instanceof Element
        ? anchorNode
        : anchorNode.parentElement
      )?.closest(".card")
      : null;
    const clickedCard = target.closest(".card");
    const shouldClearSelection = !clickedCard || clickedCard !== selectedCard;
    if (shouldClearSelection) {
      selection.removeAllRanges();
    }
  }

  // 如果点击的是 grid 或 body，切换所有卡片到预览模式
  if (target === grid || target === document.body) {
    toggleAllToPreview();
    cleanupUnusedImages();
  }
});

/**
 * Normalizes imported layout numbers, falling back to defaults for missing values.
 * @param {StickyConfigEntry} cfg Imported config entry.
 * @param {Omit<Sticky, "text">} defaults Fallback layout.
 * @returns {Omit<Sticky, "text">} Normalized layout.
 */
function normalizeImportedLayout(
  cfg: StickyConfigEntry,
  defaults: Omit<Sticky, "text">,
): Omit<Sticky, "text"> {
  return {
    x: Number(cfg.x) || defaults.x,
    y: Number(cfg.y) || defaults.y,
    width: Number(cfg.width) || defaults.width,
    height: Number(cfg.height) || defaults.height,
    zIndex: Number(cfg.zIndex) || defaults.zIndex,
  };
}

/**
 * Returns current maximum z-index across all stickys.
 * @returns {number} Maximum z-index value.
 */
function getMaxZIndex(): number {
  const zIndexes = Object.values(stickys).map((s) => s.zIndex || 1);
  return zIndexes.length > 0 ? Math.max(...zIndexes) : 1;
}

/**
 * Returns a default sticky layout config with slight offset.
 * @param {number} index Zero-based index.
 * @param {number} baseZIndex Base z-index.
 * @returns {Omit<Sticky, "text">} Default sticky layout config.
 */
function getDefaultStickyLayout(
  index: number,
  baseZIndex: number,
): Omit<Sticky, "text"> {
  const offset = (index + 1) * 10;
  return {
    x: offset,
    y: offset,
    width: 20,
    height: 10,
    zIndex: baseZIndex + index + 1,
  };
}

/**
 * Brings a card to the top z-index and persists that z-index.
 * @param {HTMLElement} card Card element to elevate.
 * @returns {void}
 */
function bringCardToFront(card: HTMLElement): void {
  const maxZIndex = getMaxZIndex() + 1;
  commitCardGeometry(card, { zIndex: maxZIndex });
}

/**
 * Moves a card to the center of current viewport and snaps to 16px grid.
 * @param {HTMLElement} card Card element to move.
 * @returns {void}
 */
function moveCardToViewportCenter(card: HTMLElement): void {
  const rect = card.getBoundingClientRect();
  const rawX = window.scrollX + (window.innerWidth - rect.width) / 2;
  const rawY = window.scrollY + (window.innerHeight - rect.height) / 2;
  const x = Math.max(0, Math.round(rawX / 16) * 16);
  const y = Math.max(0, Math.round(rawY / 16) * 16);

  commitCardGeometry(card, { x, y });
}

/**
 * Initializes storage, migration and initial card rendering.
 * @returns {Promise<void>}
 */
async function initializeState(): Promise<void> {
  try {
    await requestPersistentStorage();
    await loadStateFromIndexedDb();
    cleanupUnusedImages();
    Object.entries(stickys).forEach(([id, data]) => {
      const card = createCard(id, data, false);
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("[storage] initialization failed", error);
  }
}

/**
 * Binds document-level listeners that do not depend on card creation.
 * @returns {void}
 */
function bindGlobalEvents(): void {
  document.addEventListener("visibilitychange", () => {
    syncSunnyVideoPlayback();
    if (document.visibilityState === "hidden") {
      flushPersistStickys();
    }
  });

  // Esc 退出编辑模式（最大化铺满视口时无法点击空白处预览）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    document.querySelectorAll<HTMLDivElement>(".card").forEach((card) => {
      if (!isCardEditing(card)) return;
      toggleEditMode(card, false);
    });
  });

  window.addEventListener("beforeunload", () => {
    flushPersistStickys();
    revokeAllImageUrls();
  });
}

/**
 * Starts the app after module state, DOM helpers and settings UI are ready.
 * @returns {Promise<void>}
 */
async function bootstrap(): Promise<void> {
  bindGlobalEvents();
  await initializeState();
}

const settingsContainer = getRequiredElement<HTMLDivElement>("#settings");

/**
 * Converts raw SVG markup into an SVGElement and applies optional attributes.
 * @param {string} svgString Raw SVG string.
 * @param {Record<string, string>} [attrs] Optional attributes to set.
 * @returns {SVGElement} Parsed SVG element.
 */
function createSvgElement(
  svgString: string,
  attrs?: Record<string, string>,
): SVGElement {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = svgDoc.querySelector("svg");

  if (!svg) throw new Error("Invalid SVG string");

  // 设置默认属性
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");

  // 添加自定义属性
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });
  }

  return svg as SVGElement;
}
const layoutIcon = createSvgElement(layout, {
  alt: "layout",
});
layoutIcon.classList.add("settings-layout-btn");
layoutIcon.setAttribute("title", t.layoutMode);
const settingsIcon = createSvgElement(settings, {
  alt: "settings",
});

/**
 * Creates an action button used in settings panel.
 * @param {string} svgRaw Raw icon SVG.
 * @param {string} label Button label.
 * @returns {HTMLButtonElement} Settings action button.
 */
function createSettingsAction(svgRaw: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-action";
  button.style.display = "none";

  const iconWrap = document.createElement("span");
  iconWrap.className = "settings-action-icon";
  iconWrap.appendChild(
    createSvgElement(svgRaw, {
      width: "14",
      height: "14",
    }),
  );

  const text = document.createElement("span");
  text.textContent = label;

  button.appendChild(iconWrap);
  button.appendChild(text);
  return button;
}

const downloadAction = createSettingsAction(download, t.exportLabel);
const uploadAction = createSettingsAction(upload, t.importLabel);

const sunnyToggle = document.createElement("label");
sunnyToggle.className = "sunny-toggle";
sunnyToggle.style.display = "none";
sunnyToggle.title = t.sunnyTheme;

const sunnyToggleInput = document.createElement("input");
sunnyToggleInput.type = "checkbox";
sunnyToggleInput.checked = getSunnyThemeEnabled();
applySunnyTheme(sunnyToggleInput.checked);
sunnyToggleInput.addEventListener("change", () => {
  const enabled = sunnyToggleInput.checked;
  applySunnyTheme(enabled);
  localStorage.setItem(SUNNY_THEME_STORAGE_KEY, enabled ? "1" : "0");
  setSettingsExpanded(false);
});

const sunnyToggleText = document.createElement("span");
sunnyToggleText.textContent = t.sunnyTheme;
sunnyToggle.appendChild(sunnyToggleInput);
sunnyToggle.appendChild(sunnyToggleText);

// 创建 GitHub 链接
const githubLink = document.createElement("a");
githubLink.href = "https://github.com/qzda/sticky-board";
githubLink.target = "_blank";
githubLink.appendChild(createSvgElement(github, { alt: "github" }));

// 添加到容器
settingsContainer.appendChild(sunnyToggle);
settingsContainer.appendChild(downloadAction);
settingsContainer.appendChild(uploadAction);
settingsContainer.appendChild(settingsIcon);
settingsContainer.appendChild(layoutIcon);
settingsContainer.appendChild(githubLink);

let isExpanded = false;
const settingsItems: HTMLElement[] = [sunnyToggle, downloadAction, uploadAction];
const SETTINGS_ITEM_ANIMATION_STEP_MS = 45;
const SETTINGS_ITEM_ANIMATION_DURATION_MS = 260;
let settingsAnimationTimer: ReturnType<typeof setTimeout> | null = null;
let layoutPanel: HTMLDivElement | null = null;
const dockedLayoutCardIds = new Set<string>();

/**
 * Clears pending settings animation timer.
 * @returns {void}
 */
function clearSettingsAnimationTimer(): void {
  if (settingsAnimationTimer) {
    clearTimeout(settingsAnimationTimer);
    settingsAnimationTimer = null;
  }
}

/**
 * Expands or collapses settings items with animation.
 * @param {boolean} expanded Target expanded state.
 * @returns {void}
 */
function setSettingsExpanded(expanded: boolean): void {
  clearSettingsAnimationTimer();
  isExpanded = expanded;

  const animatedOrder = [...settingsItems].reverse();
  if (!isExpanded) {
    animatedOrder.forEach((item, index) => {
      item.classList.remove("settings-pop-in");
      item.classList.remove("settings-pop-out");
      item.style.pointerEvents = "none";
      item.style.animationDelay = `${index * SETTINGS_ITEM_ANIMATION_STEP_MS}ms`;
      void item.offsetWidth;
      item.classList.add("settings-pop-out");
    });

    const hideDelay =
      (animatedOrder.length - 1) * SETTINGS_ITEM_ANIMATION_STEP_MS +
      SETTINGS_ITEM_ANIMATION_DURATION_MS;
    settingsAnimationTimer = setTimeout(() => {
      settingsItems.forEach((item) => {
        item.style.display = "none";
        item.style.pointerEvents = "";
        item.classList.remove("settings-pop-out");
        item.style.animationDelay = "0ms";
      });
      settingsAnimationTimer = null;
    }, hideDelay);
    return;
  }

  animatedOrder.forEach((item, index) => {
    item.style.display = "inline-flex";
    item.style.pointerEvents = "";
    item.classList.remove("settings-pop-in");
    item.classList.remove("settings-pop-out");
    item.style.animationDelay = `${index * SETTINGS_ITEM_ANIMATION_STEP_MS}ms`;
    // 触发重排以确保重复展开时动画可重新播放
    void item.offsetWidth;
    item.classList.add("settings-pop-in");
  });
}

/**
 * Parses creation timestamp from sticky id.
 * @param {string} id Sticky id.
 * @returns {number} Unix timestamp in ms. Falls back to 0 when invalid.
 */
function getStickyTimestamp(id: string): number {
  const firstSegment = id.split("-")[0];
  const ts = Number(firstSegment);
  return Number.isFinite(ts) ? ts : 0;
}

/**
 * Formats a timestamp into date key (YYYY-MM-DD).
 * @param {number} timestamp Unix timestamp in ms.
 * @returns {string} Date key.
 */
function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ensures layout mode panel exists.
 * @returns {void}
 */
function ensureLayoutPanel(): void {
  if (layoutPanel) return;
  layoutPanel = document.createElement("div");
  layoutPanel.className = "layout-panel";
  grid.appendChild(layoutPanel);
}

/**
 * Restores all cards back to original grid absolute layout.
 * @returns {void}
 */
function restoreFromLayoutMode(): void {
  dockedLayoutCardIds.forEach((cardId) => {
    const card = cardElementMap.get(cardId);
    if (!card) return;
    card.classList.remove("layout-docked");
    if (card.parentElement !== grid) {
      grid.appendChild(card);
    }
  });
  dockedLayoutCardIds.clear();
  if (layoutPanel) layoutPanel.innerHTML = "";
}

/**
 * Renders timeline layout (newest day first, cards grouped by day).
 * @returns {void}
 */
function renderTimelineLayout(): void {
  if (!layoutPanel) return;
  layoutPanel.innerHTML = "";

  const hint = document.createElement("div");
  hint.className = "layout-timeline-hint";
  hint.textContent = t.timelineHint;
  layoutPanel.appendChild(hint);

  const entries = Object.keys(stickys).sort(
    (a, b) => getStickyTimestamp(b) - getStickyTimestamp(a),
  );
  const grouped = new Map<string, string[]>();
  entries.forEach((id) => {
    const key = getDateKey(getStickyTimestamp(id));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(id);
  });

  grouped.forEach((ids, day) => {
    const group = document.createElement("div");
    group.className = "layout-day-group";

    const marker = document.createElement("div");
    marker.className = "layout-day-marker";
    marker.textContent = day;

    const row = document.createElement("div");
    row.className = "layout-day-row";

    ids.forEach((id) => {
      const card = cardElementMap.get(id);
      if (!card) return;
      card.classList.add("layout-docked");
      row.appendChild(card);
      dockedLayoutCardIds.add(id);
    });

    group.appendChild(marker);
    group.appendChild(row);
    layoutPanel!.appendChild(group);
  });
}

/**
 * Animates cards from their pre-layout rects to their new positions (FLIP).
 * @param {HTMLElement[]} cards Cards captured before the layout change.
 * @param {Map<HTMLElement, DOMRect>} previousRects Viewport rect per card.
 * @returns {void}
 */
function animateCardLayoutChange(
  cards: HTMLElement[],
  previousRects: Map<HTMLElement, DOMRect>,
): void {
  cards.forEach((card) => {
    const previous = previousRects.get(card);
    if (!previous) return;
    animateFlipFrom(card, previous);
  });
}

/**
 * Toggles timeline layout mode on/off.
 * @param {boolean} enabled Whether to enable layout mode.
 * @returns {void}
 */
function setLayoutMode(enabled: boolean): void {
  if (enabled === isTimelineLayout()) return;
  ensureLayoutPanel();

  // 先记录卡片位置并关闭过渡，布局切换后再用 FLIP 补间
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".card"));
  const previousRects = new Map<HTMLElement, DOMRect>();
  cards.forEach((card) => {
    previousRects.set(card, card.getBoundingClientRect());
    card.style.transition = "none";
  });

  document.body.classList.toggle("layout-timeline", enabled);
  document.documentElement.classList.toggle("layout-timeline", enabled);
  layoutIcon.classList.toggle("active", enabled);

  if (enabled) {
    setSettingsExpanded(false);
    renderTimelineLayout();
  } else {
    restoreFromLayoutMode();
  }

  animateCardLayoutChange(cards, previousRects);
}

// 点击 settings 按钮展开/收起
settingsIcon.addEventListener("click", () => {
  setSettingsExpanded(!isExpanded);
});

layoutIcon.addEventListener("click", () => {
  setLayoutMode(!isTimelineLayout());
});

// 导出功能
downloadAction.addEventListener("click", async () => {
  setSettingsExpanded(false);
  try {
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    if (!imagesFolder) {
      throw new Error("Failed to create images folder in zip");
    }

    const imagePathByKey: Record<string, string> = {};
    Object.entries(imageStore).forEach(([imageKey, blob]) => {
      const ext = getBlobExtension(blob);
      const imagePath = `images/${imageKey}.${ext}`;
      imagePathByKey[imageKey] = `./${imagePath}`;
      imagesFolder.file(`${imageKey}.${ext}`, blob);
    });

    const config: StickyConfigMap = {};
    Object.entries(stickys).forEach(([id, sticky]) => {
      const mdPath = `./${id}.md`;
      const markdown = toZipMarkdown(sticky.text || "", imagePathByKey);
      zip.file(`${id}.md`, markdown);
      const { text: _text, ...stickyLayout } = sticky;
      config[id] = {
        ...stickyLayout,
        path: mdPath,
      };
    });

    zip.file("sticky-board-config.json", JSON.stringify(config, null, 2));

    const timestamp = Date.now();
    const filename = `sticky-board-${timestamp}.zip`;
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[storage] export failed", error);
  }
});

// 导入功能
uploadAction.addEventListener("click", () => {
  setSettingsExpanded(false);
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip";

  input.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    void (async () => {
      try {
        const zip = await JSZip.loadAsync(file);
        const mdFiles = zip
          .file(/\.md$/i)
          .filter((entry) => !entry.dir);
        if (mdFiles.length === 0) {
          alert(t.invalidFormat);
          return;
        }

        let configById: StickyConfigMap = {};
        const configFile = zip.file("sticky-board-config.json");
        if (configFile) {
          try {
            const configText = await configFile.async("text");
            const parsed = JSON.parse(configText);
            if (isRecord(parsed)) {
              configById = parsed as StickyConfigMap;
            }
          } catch (error) {
            console.warn("[import] failed to parse sticky-board-config.json", error);
          }
        }

        const configPathToId = new Map<string, string>();
        Object.entries(configById).forEach(([id, cfg]) => {
          if (!cfg || typeof cfg.path !== "string") return;
          configPathToId.set(normalizeZipPath(cfg.path), id);
        });

        const baseTimestamp = Date.now();
        const usedIds = new Set<string>([
          ...Object.keys(stickys),
          ...Object.keys(configById),
        ]);
        let generatedIdCount = 0;
        const nextGeneratedId = (): string => {
          while (true) {
            const candidate = `${baseTimestamp + generatedIdCount * 100}`;
            generatedIdCount += 1;
            if (!usedIds.has(candidate)) {
              usedIds.add(candidate);
              return candidate;
            }
          }
        };

        const importedStickys: Stickys = {};
        const importedImages: Record<string, Blob> = {};
        const baseZIndex = getMaxZIndex();
        let defaultLayoutIndex = 0;

        for (const mdFile of mdFiles) {
          const mdZipPath = normalizeZipPath(mdFile.name);
          const rawMarkdown = await mdFile.async("text");

          let id = configPathToId.get(mdZipPath);
          if (!id) {
            const withDotSlash = `./${mdZipPath}`;
            id = configPathToId.get(withDotSlash);
          }
          if (!id) {
            id = nextGeneratedId();
          } else {
            usedIds.add(id);
          }

          const converted = await fromZipMarkdown(rawMarkdown, mdZipPath, zip, id);
          Object.assign(importedImages, converted.images);

          const cfg = configById[id];
          const defaultLayout = getDefaultStickyLayout(defaultLayoutIndex, baseZIndex);
          const layout = cfg
            ? normalizeImportedLayout(cfg, defaultLayout)
            : defaultLayout;
          if (!cfg) {
            defaultLayoutIndex += 1;
          }

          importedStickys[id] = {
            ...layout,
            text: converted.text,
          };
        }

        const mergedStickys = { ...stickys, ...importedStickys };
        const mergedImages = { ...imageStore, ...importedImages };
        const importCount = Object.keys(importedStickys).length;
        const existingIds = Object.keys(stickys).filter(
          (id) => id in importedStickys,
        ).length;
        const newIds = importCount - existingIds;
        const message = t.importConfirm(importCount, existingIds, newIds);

        if (confirm(message)) {
          Object.keys(importedImages).forEach((key) => revokeImageUrl(key));
          stickys = mergedStickys;
          imageStore = mergedImages;
          cleanupUnusedImages();
          cancelScheduledPersistStickys();
          await persistStickys();
          await persistImageStore();
          location.reload();
        }
      } catch (error) {
        alert(t.parseFailed);
        console.error(error);
      }
    })();
  });

  input.click();
});

// 配置 interact.js
interact(".card")
  .resizable({
    edges: { right: ".resize", bottom: ".resize" },
    modifiers: [
      interact.modifiers.restrictEdges({
        outer: "parent",
      }),
    ],
    inertia: true,

    listeners: {
      start(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;
        target.classList.add("move");
        document.body.classList.add("move");
        bringCardToFront(target);
      },

      end(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;
        target.classList.remove("move");
        document.body.classList.remove("move");
      },

      move(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;

        const width = (event.rect.width / 16) >> 0,
          height = (event.rect.height / 16) >> 0;

        commitCardGeometry(target, { width, height });
      },
    },
  })
  .draggable({
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: 16, y: 16 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }],
      }),
      interact.modifiers.restrict({
        restriction: grid,
        elementRect: { top: 0, left: 0, bottom: 0, right: 0 },
        endOnly: true,
      }),
    ],
    inertia: true,
    ignoreFrom: "textarea, .preview",

    listeners: {
      start(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;
        target.classList.add("move");
        document.body.classList.add("move");
        bringCardToFront(target);
      },

      end(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;
        target.classList.remove("move");
        document.body.classList.remove("move");

        const sticky = stickys[target.id];
        if (!sticky) return;
        commitCardGeometry(target, {
          x: sticky.x + event.dx,
          y: sticky.y + event.dy,
        });
      },

      move(event) {
        if (isCardTransformLocked(event.target as HTMLElement)) return;
        const target = event.target as HTMLElement;
        const sticky = stickys[target.id];
        if (!sticky) return;
        commitCardGeometry(target, {
          x: sticky.x + event.dx,
          y: sticky.y + event.dy,
        });
      },
    },
  });

void bootstrap();
