import { BOARD_TIME_LAPSE } from "@core/board-time";
import { isRecord } from "@core/snapshot";
import { realSeconds } from "./travel-time";

/** The cruise as it is saved (docs/design/partidas.md): its real days and the real seconds it plays in and has left. */
export interface CruiseSnapshot {
  readonly cruiseDays: number;
  readonly totalS: number;
  readonly leftS: number;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The Starship's cruise to Bennu after level 3's launch (docs/design/santuario3-lanzamiento.md): the real trip
 * (OSIRIS-REx's 816 days) played at the board's pace with the trips' cap (docs/design/viajes.md). It counts the
 * real seconds left; it is saved and comes back at the same point (a reload in mid-cruise does not arrive).
 */
export class CruiseClock {
  private constructor(
    readonly cruiseDays: number,
    readonly totalS: number,
    private left: number,
  ) {}

  /** A cruise of `cruiseDays` real days, just started. */
  static start(cruiseDays: number, lapse: number = BOARD_TIME_LAPSE): CruiseClock {
    const total = realSeconds(Math.max(0, cruiseDays) * 86_400, lapse);
    return new CruiseClock(cruiseDays, total, total);
  }

  /** A saved cruise still under way, or undefined (missing, broken or already over). */
  static restore(s: unknown): CruiseClock | undefined {
    if (!isRecord(s) || !finite(s.cruiseDays) || !finite(s.totalS) || !finite(s.leftS)) return undefined;
    if (s.totalS <= 0 || s.leftS <= 0 || s.cruiseDays < 0) return undefined;
    return new CruiseClock(s.cruiseDays, s.totalS, Math.min(s.totalS, s.leftS));
  }

  /** Real seconds left. */
  get leftS(): number {
    return this.left;
  }
  /** 0 at the start … 1 at Bennu. */
  get fraction(): number {
    return this.totalS > 0 ? (this.totalS - this.left) / this.totalS : 1;
  }
  get active(): boolean {
    return this.left > 0;
  }

  /** Let `realDtS` pass. */
  advance(realDtS: number): void {
    this.left = Math.max(0, this.left - Math.max(0, realDtS));
  }

  snapshot(): CruiseSnapshot {
    return { cruiseDays: this.cruiseDays, totalS: this.totalS, leftS: this.left };
  }
}
