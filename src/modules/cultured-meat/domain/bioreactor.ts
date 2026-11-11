import type { Sourced } from "@core/units";

const CS_LAB = "https://github.com/videnacry/cold-sanctuary/blob/master/docs/carne-cultivada.md";

/**
 * Real process figures, as gathered for Cold Sanctuary's cultured-meat lab: muscle satellite cells
 * double about every 24 h at 37 °C and pH 7.2–7.4; a gram of muscle holds 2–3·10⁸ cells, so 2 kg
 * needs ~5·10¹¹ cells, about 9 doublings from a 10⁹-cell vial. Serum-free media (e.g. Beefy-9) need
 * no slaughtered animal.
 */
export const CULTURE: Sourced<{
  doublingDays: number;
  tempC: number;
  ph: readonly [number, number];
  vialCells: number;
  cellsPerGram: number;
  targetCells: number;
}> = {
  value: { doublingDays: 1, tempC: 37, ph: [7.2, 7.4], vialCells: 1e9, cellsPerGram: 2.5e8, targetCells: 5e11 },
  source: CS_LAB,
  note: "Beefy-9 serum-free medium: Stout et al. 2022, Communications Biology.",
};

/** Game tuning (not measured): how fast the medium is used up and the pH drifts. */
export const BIOREACTOR_TUNING = {
  glucosePerDay: 0.35,
  /** Lactate from glucose lowers the pH. */
  phDropPerDay: 0.12,
  /** Below this pH, or without glucose, the cells stop growing. */
  phStall: 7.0,
  /** Below this the culture dies. */
  phDeath: 6.8,
  differentiationDays: 3,
} as const;

export type CultureStage = "vacio" | "proliferando" | "listo-para-diferenciar" | "diferenciando" | "listo" | "perdido" | "contaminado";

/**
 * Stirred-tank bioreactor growing cultured meat from a frozen cell vial, with no animal killed.
 * Seed → proliferate (renew medium, correct pH) → differentiate on an edible scaffold → harvest.
 */
export class Bioreactor {
  private _stage: CultureStage = "vacio";
  private _cells = 0;
  private _glucose = 0;
  private _ph = 7.4;
  private _diffDays = 0;

  get stage(): CultureStage {
    return this._stage;
  }
  get cells(): number {
    return this._cells;
  }
  get glucose(): number {
    return this._glucose;
  }
  get ph(): number {
    return this._ph;
  }
  get doublings(): number {
    return this._cells > 0 ? Math.log2(this._cells / CULTURE.value.vialCells) : 0;
  }
  /** Medium is running low or the pH has left the healthy range. */
  get needsMedium(): boolean {
    return this._stage === "proliferando" && (this._glucose < 0.35 || this._ph < CULTURE.value.ph[0]);
  }
  /** Grams of tissue the current cells would make. */
  get yieldG(): number {
    return Math.round(this._cells / CULTURE.value.cellsPerGram);
  }

  seed(): void {
    if (this._stage !== "vacio") throw new Error(`Cannot seed in stage ${this._stage}`);
    this._stage = "proliferando";
    this._cells = CULTURE.value.vialCells;
    this._glucose = 1;
    this._ph = 7.4;
  }

  /** Perfusion with fresh medium and bicarbonate: glucose back up, pH back to 7.4. */
  renewMedium(): void {
    if (this._stage !== "proliferando") throw new Error(`Nothing to feed in stage ${this._stage}`);
    this._glucose = 1;
    this._ph = 7.4;
  }

  differentiate(): void {
    if (this._stage !== "listo-para-diferenciar") throw new Error(`Cannot differentiate in stage ${this._stage}`);
    this._stage = "diferenciando";
    this._diffDays = 0;
  }

  /** Returns grams of cultured meat. */
  harvest(): number {
    if (this._stage !== "listo") throw new Error(`Nothing to harvest in stage ${this._stage}`);
    const g = this.yieldG;
    this.reset();
    return g;
  }

  /** A jolt or a broken seal lets bacteria in. */
  contaminate(): void {
    if (this._stage !== "vacio") this._stage = "contaminado";
  }

  /** Autoclave and clean a lost or contaminated batch. */
  sterilize(): void {
    if (this._stage !== "contaminado" && this._stage !== "perdido") throw new Error(`Nothing to sterilize in stage ${this._stage}`);
    this.reset();
  }

  tick(dtDays: number): void {
    const t = BIOREACTOR_TUNING;
    if (this._stage === "diferenciando") {
      this._diffDays += dtDays;
      if (this._diffDays >= t.differentiationDays) this._stage = "listo";
      return;
    }
    if (this._stage !== "proliferando") return;
    const growing = this._glucose > 0.05 && this._ph >= t.phStall;
    if (growing) this._cells = Math.min(CULTURE.value.targetCells, this._cells * 2 ** (dtDays / CULTURE.value.doublingDays));
    this._glucose = Math.max(0, this._glucose - t.glucosePerDay * dtDays);
    this._ph -= t.phDropPerDay * dtDays * (growing ? 1 : 0.5);
    if (this._ph < t.phDeath) {
      this._stage = "perdido";
      return;
    }
    if (this._cells >= CULTURE.value.targetCells) this._stage = "listo-para-diferenciar";
  }

  private reset(): void {
    this._stage = "vacio";
    this._cells = 0;
    this._glucose = 0;
    this._ph = 7.4;
    this._diffDays = 0;
  }
}
