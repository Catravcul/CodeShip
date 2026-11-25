import type { Pt } from "./shape";

/** A glyph to draw: its strokes in order, each a polyline in its drawing direction (em units, y down). */
export interface Glyph {
  readonly char: string;
  /** Advance width (em). */
  readonly width: number;
  readonly strokes: readonly (readonly Pt[])[];
}
