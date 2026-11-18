/**
 * When the game saves on its own (docs/design/partidas.md): every `everyS` real seconds, and at once at the
 * moments that matter (an arrival, the end of a challenge, waking up), never twice within `minGapS`. The page
 * being hidden (a phone locking, the tab closing, a reload) saves right away. Times are real seconds. Game values.
 */
export const AUTO_SAVE = {
  /** Every minute of play: at most a minute is lost (a day on board is 24 real minutes). */
  everyS: 60,
  /** Two key moments close together save once. */
  minGapS: 5,
} as const;

export type SaveReason = "cada-rato" | "llegada" | "reto" | "sueño" | "ocultar";

export class AutoSave {
  private last = 0;
  private pending: SaveReason | undefined;

  constructor(private readonly o: { everyS: number; minGapS: number } = AUTO_SAVE) {}

  /** A key moment happened: save as soon as allowed. */
  mark(reason: Exclude<SaveReason, "cada-rato">): void {
    if (this.pending !== "ocultar") this.pending = reason;
  }

  /** Why to save now (`nowS`, real seconds), or undefined. */
  due(nowS: number): SaveReason | undefined {
    if (this.pending === "ocultar") return "ocultar";
    if (this.pending && nowS - this.last >= this.o.minGapS) return this.pending;
    if (nowS - this.last >= this.o.everyS) return "cada-rato";
    return undefined;
  }

  /** It was saved at `nowS`. */
  saved(nowS: number): void {
    this.last = nowS;
    this.pending = undefined;
  }
}
