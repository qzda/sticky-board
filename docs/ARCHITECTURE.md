# Sticky Board Architecture

This document describes the app in implementation detail so an AI/codegen system can rebuild it from scratch in one pass.

## 1. Product Scope

Sticky Board is a single-page web app for draggable/resizable markdown cards.

Core capabilities:

- Create cards by drag-selecting empty canvas area.
- Edit card content in textarea, preview as markdown.
- Store card positions/sizes/z-index/text locally.
- Paste images into markdown with size limit; render images from local storage.
- Import/export JSON including cards and pasted images.
- Optional Sunny theme overlay (video), persisted as a setting.
- Multi-language UI (Chinese/English) by browser locale.

No backend, no account, no sync.

## 2. Tech Stack

- Runtime: browser only.
- Build: Vite + TypeScript.
- Interaction: `interactjs` (drag + resize + grid snap + bounds).
- Markdown rendering: `markdown-it`.
- Storage:
  - App data: IndexedDB (`sticky-board-db`).
  - Config only: localStorage (`sunnyThemeEnabled`).

## 3. Project File Map

- `index.html`:
  - Base layout containers (`#root`, `#settings`).
  - Global CSS variables.
  - Script that sets `<html lang>` to `zh` or `en`.
- `src/main.ts`:
  - Entire app logic (state, storage, rendering, events, import/export, theme).
- `src/style.css`:
  - Card styles, settings UI, sunny overlay, preview modal.
- `src/assets/*`:
  - SVG icons and `leaves.mp4`.

## 4. Data Model

```ts
type Sticky = {
  x: number;
  y: number;
  width: number;  // rem units
  height: number; // rem units
  zIndex: number;
  text: string;   // markdown source
};

type Stickys = Record<string, Sticky>;
```

Image model:

- Markdown stores image references as:
  - `![alt](sticky-image://<imageKey>)`
- In-memory/image persistence store:
  - `Record<string, Blob>`
- Image key format:
  - `[stickyID]-[imageID]`

## 5. Persistence Architecture

### 5.1 IndexedDB Schema

- DB name: `sticky-board-db`
- Version: `1`
- Object store: `app-state` (`keyPath: "key"`)
- Keys used:
  - `stickys`
  - `stickyImages`

Stored values:

- `stickys` -> `Stickys`
- `stickyImages` -> `Record<string, Blob>`

### 5.2 localStorage Policy

Allowed key:

- `sunnyThemeEnabled` only.

Removed keys after migration:

- `stickys`
- `stickyImages`

### 5.3 Startup Migration Flow

On app init:

1. Request persistent storage via `navigator.storage.persist()`.
2. Read localStorage legacy keys if present.
3. Parse and normalize:
   - `stickys`: object check.
   - `stickyImages`: convert base64 data URL strings to Blob.
4. Merge with existing IndexedDB data (local values override on same key).
5. Write merged values to IndexedDB.
6. Remove legacy localStorage data keys.
7. Log migration status to console.

Console log contract:

- Start/no-op/completed/error cases are all logged with `[storage]` prefix.

## 6. Rendering Pipeline

## 6.1 Markdown

- `markdown-it` options:
  - `html: true`
  - `linkify: true`
  - `breaks: true`
- Link renderer override:
  - Force `target="_blank"` and `rel="noopener noreferrer"`.
- Image renderer override:
  - Detect `sticky-image://` URI.
  - Resolve key to Blob.
  - Convert Blob to object URL for `<img src>`.
  - Add `data-image-key` for diagnostics.

## 6.2 Card View Modes

- Edit mode: textarea visible, preview hidden.
- Preview mode: textarea hidden, preview HTML regenerated from markdown.
- Global click on canvas/body exits edit mode for all cards.

## 6.3 Image Preview Modal

- Clicking image in preview opens full-screen modal.
- Modal closes on background click or Escape.

## 7. Interaction Model

## 7.1 Card Creation

- Mousedown on root canvas starts draw state.
- Mousemove renders temporary shadow rectangle.
- Mouseup creates card if width/height >= 160px each.
- Size converts px -> rem by floor division (`/16`).

## 7.2 Card Move/Resize

- `interactjs` resizable:
  - Handle: `.resize`.
  - Restrict edges to parent.
- `interactjs` draggable:
  - Ignore `textarea, .preview`.
  - Snap to 16px grid.
  - Restrict to root bounds.
- On drag/resize start:
  - Bring card to front (`max z-index + 1`).
- On move/end:
  - Persist x/y/width/height.

## 7.3 Enter Edit Mode

- Right-click (`contextmenu`) on card enters edit mode.
- Right-click on delete button / resize handle is ignored.

## 8. Image Handling

Paste flow:

1. Intercept `paste` on textarea.
2. Extract first clipboard `image/*` item.
3. Reject if image size exceeds configured limit.
4. Create image key `[stickyId]-[imageId]`.
5. Store Blob in image store and persist.
6. Insert markdown image reference using `sticky-image://<key>`.
7. Persist card text.

Unused image cleanup:

- Parse all card markdown for referenced image keys.
- Remove unreferenced image blobs.
- Revoke object URL cache entries.
- Persist image store if changed.
- Text edits use debounce for cleanup scheduling.

## 9. Settings Panel

Panel items:

- Sunny toggle.
- Export action.
- Import action.
- Gear icon expands/collapses list.

Animation behavior:

- Items appear from right-to-left with opacity fade.
- Bottom item appears first.
- Collapse has reverse animation before display is removed.

Sunny setting persistence:

- Stored in localStorage key `sunnyThemeEnabled`.

## 10. Sunny Theme

- Full-screen video overlay (`leaves.mp4`).
- Video starts only when theme enabled and document visible.
- Pauses when tab hidden.
- Uses `mix-blend-mode` and CSS filters for shadow look.
- Hidden when `prefers-reduced-motion: reduce`.

## 11. Import / Export Contract

Export JSON shape:

```json
{
  "stickys": { "...": { "x": 0, "y": 0, "width": 20, "height": 10, "zIndex": 1, "text": "..." } },
  "stickyImages": { "<imageKey>": "data:image/...;base64,..." }
}
```

Notes:

- Runtime store uses Blob, but export serializes images as base64 data URLs.
- Import accepts both:
  - legacy shape: `stickys` object directly.
  - new shape: `{ stickys, stickyImages }`.
- Imported image values are normalized into Blob.
- Imported values merge into existing in-memory state.

## 12. Localization

- UI language selection rule:
  - If `navigator.language` starts with `zh` -> Chinese.
  - Else -> English.
- `index.html` also sets `<html lang>` with same logic.

## 13. Performance and Resource Controls

- Debounced image cleanup.
- Persistent storage request for reduced eviction risk.
- Object URL cache with explicit revocation:
  - per-image on deletion/replacement
  - global on `beforeunload`
- IndexedDB async writes avoid main-thread localStorage blocking.

## 14. Rebuild Checklist (for AI implementation)

Implement in this order:

1. Base layout + global styles + root/settings containers.
2. Type models (`Sticky`, `Stickys`) + locale text table.
3. IndexedDB adapter (`open/read/write`) + migration from localStorage.
4. Markdown renderer with custom link/image rules.
5. Card DOM factory + edit/preview toggle.
6. Paste-image pipeline with `sticky-image://` keys and Blob storage.
7. Create/move/resize interactions via interactjs.
8. Settings panel actions (Sunny/export/import) with animation.
9. Import/export serialization (Blob <-> base64).
10. Cleanup and object URL lifecycle management.
11. Startup bootstrap (`persist()`, migrate, load, render).
12. Verify localStorage only keeps `sunnyThemeEnabled`.
