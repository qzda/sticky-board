/**
 * One sticky note.
 */
export type Sticky = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
};

/** Sticky notes keyed by id. */
export type Stickys = Record<string, Sticky>;
