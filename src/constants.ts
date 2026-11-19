/**
 * Pixels per rem assumed by the layout math and the CSS dot grid.
 * Sticky `x/y` are stored in pixels while `width/height` are stored in rem.
 */
export const REM_IN_PX = 16;

/** Grid snap step for dragging and card creation, in pixels (matches 1rem). */
export const GRID_SIZE = REM_IN_PX;

/** Minimum width and height of a card created by dragging, in pixels. */
export const MIN_CARD_SIZE_PX = 10 * REM_IN_PX;

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
