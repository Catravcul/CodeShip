import { dist, length, pt, resample, toLine, type Pt } from "./shape";

/**
 * FOLLOWING A STROKE WITH THE FINGER (docs/design/retos-trazos.md §Comprobación). The stroke and the finger are in the
 * same units (screen pixels in the game); `tol` is how far the finger may be from the line, set by the caller relative
 * to the glyph's size on screen. The stroke is cut into samples every half tolerance; the finger covers them in order,
 * from the start (a sample further on counts only if the earlier ones were passed or are a short gap back), so a stroke
 * done backwards or from its middle does not count. It is right when at least `need` (85 %) of the samples are covered
 * and little of the path strays far from the line.
 */
export type TraceWhy = "inicio" | "corto" | "sentido" | "fuera";

export interface TraceCheck {
  readonly ok: boolean;
  /** Share of the stroke covered in order (0–1). */
  readonly coverage: number;
  /** Share of the finger's path far from the line (0–1). */
  readonly stray: number;
  readonly why?: TraceWhy;
}

export interface TraceRules {
  /** Share of the stroke to cover (default 0,85). */
  readonly need?: number;
  /** Share of the path allowed far (beyond 1,8 tolerances) from the line (default 0,3). */
  readonly maxStray?: number;
}

export const NEED = 0.85;
export const MAX_STRAY = 0.3;

export class StrokeTracker {
  readonly samples: Pt[];
  private cursor = 0;
  private hits = 0;
  private last?: Pt;
  private readonly path: Pt[] = [];
  private readonly window: number;
  private readonly step: number;

  constructor(
    readonly stroke: readonly Pt[],
    readonly tol: number,
    readonly rules: TraceRules = {},
  ) {
    this.step = tol / 2;
    this.samples = resample(stroke, this.step);
    // A gap of up to ~1,5 tolerances may be skipped (a quick finger, a corner cut short).
    this.window = Math.max(3, Math.round((1.5 * tol) / this.step));
  }

  /** How far along the stroke the finger has come (0–1), to draw it filling in. */
  get progress(): number {
    return this.cursor / this.samples.length;
  }
  get coverage(): number {
    return this.hits / this.samples.length;
  }
  /** The finger's path so far (densified). */
  get trail(): readonly Pt[] {
    return this.path;
  }

  /** The finger at p. Returns the progress. */
  add(p: Pt): number {
    const from = this.last;
    this.last = p;
    if (!from) this.visit(p);
    else {
      // Densify, so a fast finger does not jump samples.
      const n = Math.max(1, Math.ceil(dist(from, p) / (this.step / 2)));
      for (let i = 1; i <= n; i++) this.visit(pt(from.x + ((p.x - from.x) * i) / n, from.y + ((p.y - from.y) * i) / n));
    }
    return this.progress;
  }

  private visit(q: Pt): void {
    this.path.push(q);
    for (;;) {
      let found = -1;
      const end = Math.min(this.samples.length, this.cursor + this.window);
      for (let j = this.cursor; j < end; j++)
        if (dist(q, this.samples[j]!) <= this.tol) {
          found = j;
          break;
        }
      if (found < 0) return;
      this.hits++;
      this.cursor = found + 1;
    }
  }

  /** The verdict on the finger lifted now. */
  finish(): TraceCheck {
    const need = this.rules.need ?? NEED;
    const far = this.path.filter((q) => toLine(q, this.stroke) > 1.8 * this.tol).length;
    const stray = this.path.length ? far / this.path.length : 1;
    const coverage = this.coverage;
    if (coverage >= need && stray <= (this.rules.maxStray ?? MAX_STRAY)) return { ok: true, coverage, stray };
    let why: TraceWhy = "corto";
    if (coverage >= need) why = "fuera";
    else if (this.path.length && length(this.stroke) > 2 * this.tol) {
      // Done the other way round?
      const back = new StrokeTracker([...this.stroke].reverse(), this.tol);
      for (const q of this.path) back.add(q);
      if (back.coverage >= need) why = "sentido";
      else if (coverage < 0.2 && dist(this.path[0]!, this.stroke[0]!) > 1.5 * this.tol) why = "inicio";
    }
    return { ok: false, coverage, stray, why };
  }
}

/** Check a whole finger path against a stroke at once. */
export function checkStroke(stroke: readonly Pt[], path: readonly Pt[], tol: number, rules: TraceRules = {}): TraceCheck {
  const t = new StrokeTracker(stroke, tol, rules);
  for (const p of path) t.add(p);
  return t.finish();
}

/** What to say after a stroke that did not count. */
export const WHY_TEXT: Record<TraceWhy, string> = {
  inicio: "Empieza en el punto brillante",
  corto: "Te faltó parte del trazo: síguelo hasta el final",
  sentido: "Al revés: empieza en el punto y sigue la flecha",
  fuera: "Te saliste de la figura: más cerca de la línea",
};
