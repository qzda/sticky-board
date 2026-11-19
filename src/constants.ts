/**
 * Pixels per rem assumed by the layout math and the CSS dot grid.
 * Sticky `x/y` are stored in pixels while `width/height` are stored in rem.
 */
export const REM_IN_PX = 16;

/** Grid snap step for dragging and card creation, in pixels (matches 1rem). */
export const GRID_SIZE = REM_IN_PX;

/** Minimum width and height of a card created by dragging, in pixels. */
export const MIN_CARD_SIZE_PX = 10 * REM_IN_PX;

/** Minimum card width/height accepted from an imported config, in rem. */
export const MIN_CARD_SIZE_REM = MIN_CARD_SIZE_PX / REM_IN_PX;

/** Maximum card width/height accepted from an imported config, in rem (CSS cap). */
export const MAX_CARD_SIZE_REM = 50;

/** Maximum `x`/`y` accepted from an imported config, in pixels. */
export const MAX_IMPORTED_COORDINATE_PX = 100_000;

/** Maximum `zIndex` accepted from an imported config. */
export const MAX_IMPORTED_Z_INDEX = 999;

/** Pointer movement before the creation shadow box appears, in pixels. */
export const CREATE_DRAG_THRESHOLD_PX = 5;

/** Debounce for IndexedDB writes triggered by text and geometry changes. */
export const PERSIST_DEBOUNCE_MS = 300;

/** How long the copy button keeps its success state, in milliseconds. */
export const COPY_FEEDBACK_MS = 1500;

/** Delay before focusing a textarea after entering edit mode, in milliseconds. */
export const EDIT_FOCUS_DELAY_MS = 200;

/** Stagger between settings items during pop-in/pop-out. */
export const SETTINGS_ITEM_ANIMATION_STEP_MS = 45;

/** Duration of one settings item pop-in/pop-out. */
export const SETTINGS_ITEM_ANIMATION_DURATION_MS = 260;
