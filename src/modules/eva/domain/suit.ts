import type { SuitSpec } from "../data/suit";

/**
 * Metabolic load relative to the EMU design average (290 W). Game tuning inside the suit's
 * 290–580 W design range: resting while holding on, crawling hand over hand, flying the jetpack.
 */
export const WORKLOAD = { rest: 0.6, crawl: 1.3, jet: 0.9 } as const;

/** Margin kept for the trip back: below this the suit asks to return. Game value, as EVA rules keep 30 min of reserve. */
export const RETURN_MARGIN_S = 30 * 60;

export type SuitStatus = "nominal" | "volver" | "reserva" | "agotado";

/** The spacesuit's consumables during one EVA. */
export class Suit {
  private o2S: number;
  private o2SecondaryS: number;
  private co2S: number;
  private batS: number;

  constructor(readonly spec: SuitSpec) {
    this.o2S = spec.primaryOxygenS.value;
    this.o2SecondaryS = spec.secondaryOxygenS.value;
    this.co2S = spec.co2ScrubberS.value;
    this.batS = spec.batteryS.value;
  }

  /** `workload` × the design average metabolic rate (capped at the design maximum). */
  tick(dtS: number, workload: number): void {
    const maxLoad = this.spec.metabolicW.value.max / this.spec.metabolicW.value.average;
    const w = Math.max(0, Math.min(maxLoad, workload));
    let o2 = dtS * w;
    const fromPrimary = Math.min(this.o2S, o2);
    this.o2S -= fromPrimary;
    o2 -= fromPrimary;
    this.o2SecondaryS = Math.max(0, this.o2SecondaryS - o2);
    this.co2S = Math.max(0, this.co2S - dtS * w);
    this.batS = Math.max(0, this.batS - dtS);
  }

  recharge(): void {
    this.o2S = this.spec.primaryOxygenS.value;
    this.o2SecondaryS = this.spec.secondaryOxygenS.value;
    this.co2S = this.spec.co2ScrubberS.value;
    this.batS = this.spec.batteryS.value;
  }

  /** Primary oxygen left, 0..1. */
  get oxygen(): number {
    return this.o2S / this.spec.primaryOxygenS.value;
  }
  get secondaryOxygen(): number {
    return this.o2SecondaryS / this.spec.secondaryOxygenS.value;
  }
  get co2Scrubber(): number {
    return this.co2S / this.spec.co2ScrubberS.value;
  }
  get battery(): number {
    return this.batS / this.spec.batteryS.value;
  }
  get onSecondary(): boolean {
    return this.o2S <= 0;
  }

  /** Seconds left at the average rate, limited by whichever runs out first (primary only). */
  get timeLeftS(): number {
    return Math.min(this.o2S, this.co2S, this.batS);
  }

  get status(): SuitStatus {
    if (this.o2SecondaryS <= 0 || this.co2S <= 0 || this.batS <= 0) return "agotado";
    if (this.onSecondary) return "reserva";
    if (this.timeLeftS < RETURN_MARGIN_S) return "volver";
    return "nominal";
  }
}
