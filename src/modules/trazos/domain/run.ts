import type { FormulaGlyph } from "./formula";
import type { Glyph } from "./glyph";
import type { Pt } from "./shape";
import type { TraceCheck, TraceRules } from "./trace";

/**
 * DRAWING A FORMULA, GLYPH BY GLYPH (docs/design/retos-trazos.md §Comprobación): each glyph's strokes in order; a
 * stroke that does not count is simply drawn again (no lives: a wrong stroke costs nothing but the retry), and after
 * two misses on the same stroke the tolerance widens (×1,4, then ×1,8 and 75 % after four), so nobody gets stuck.
 */
export type TraceEvent = "trazo" | "glifo" | "compuesto" | "repite";

export class TraceRun {
  private g = 0;
  private s = 0;
  private miss = 0;
  /** Misses in the whole formula (for the record; they cost nothing). */
  misses = 0;

  constructor(
    readonly glyphs: readonly FormulaGlyph[],
    private readonly lookup: (char: string) => Glyph,
  ) {
    if (!glyphs.length) throw new Error("Empty formula");
  }

  get glyphIndex(): number {
    return this.g;
  }
  get strokeIndex(): number {
    return this.s;
  }
  get done(): boolean {
    return this.g >= this.glyphs.length;
  }
  /** The glyph to draw now. */
  get glyph(): Glyph | undefined {
    const f = this.glyphs[this.g];
    return f ? this.lookup(f.char) : undefined;
  }
  get stroke(): readonly Pt[] | undefined {
    return this.glyph?.strokes[this.s];
  }
  /** Misses on the stroke now. */
  get strokeMisses(): number {
    return this.miss;
  }
  /** The tolerance's factor and the rules for the stroke now (wider after misses). */
  get help(): { readonly widen: number; readonly rules: TraceRules } {
    if (this.miss >= 4) return { widen: 1.8, rules: { need: 0.75, maxStray: 0.4 } };
    if (this.miss >= 2) return { widen: 1.4, rules: {} };
    return { widen: 1, rules: {} };
  }

  /** The verdict on the stroke just drawn. */
  submit(check: TraceCheck): TraceEvent {
    if (this.done) throw new Error("Formula done");
    if (!check.ok) {
      this.miss++;
      this.misses++;
      return "repite";
    }
    this.miss = 0;
    this.s++;
    if (this.s < (this.glyph?.strokes.length ?? 0)) return "trazo";
    this.s = 0;
    this.g++;
    return this.done ? "compuesto" : "glifo";
  }
}
