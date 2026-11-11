/**
 * Stages for bringing a new cat home, condensed from the AAFP/Feline VMA step-by-step guide:
 * transition room → scent swap → play through a closed door → visual access through a screen →
 * supervised proximity → living together. Never advance until both cats are comfortable.
 * https://catvets.com/wp-content/uploads/2024/07/Step-by-Step-Guide-How-to-Introduce-a-New-Cat-to-Other-Cats-in-Your-Home.pdf
 */
export const STAGES = ["separados", "olores", "juego-tras-puerta", "contacto-visual", "juntos-supervisados", "amigos"] as const;
export type Stage = (typeof STAGES)[number];

/** Game tuning: calm days needed per stage, and the stress level that counts as comfortable. */
export const INTRO_TUNING = { calmDaysPerStage: 1.5, comfortableStress: 0.5 } as const;

export class Introduction {
  private _stage = 0;
  private _calmDays = 0;

  constructor(
    readonly newcomerId: string,
    readonly residentId: string,
  ) {}

  get stage(): Stage {
    return STAGES[this._stage]!;
  }
  get friends(): boolean {
    return this.stage === "amigos";
  }
  /** From visual contact on, the cats can meet (and hiss or greet). */
  get canMeet(): boolean {
    return this._stage >= STAGES.indexOf("contacto-visual");
  }

  /**
   * Advance with time when both are calm; `friendly` (a greeting this period) doubles the pace.
   * Returns true when the stage changed.
   */
  tick(dtDays: number, stressNewcomer: number, stressResident: number, friendly = false): boolean {
    if (this.friends) return false;
    const calm = Math.max(stressNewcomer, stressResident) < INTRO_TUNING.comfortableStress;
    if (!calm) {
      this._calmDays = 0;
      return false;
    }
    this._calmDays += dtDays * (friendly ? 2 : 1);
    if (this._calmDays < INTRO_TUNING.calmDaysPerStage) return false;
    this._calmDays = 0;
    this._stage++;
    return true;
  }

  /** After a fight the AAFP guide says to go back a step and slow down. */
  regress(): void {
    this._calmDays = 0;
    this._stage = Math.max(0, Math.min(this._stage - 1, STAGES.indexOf("juntos-supervisados") - 1));
  }

  /** Start at a later stage (cats that already met before the game starts). */
  startAt(stage: Stage): this {
    this._stage = STAGES.indexOf(stage);
    return this;
  }

  /** A hiss sets the current stage's progress back to zero. */
  setback(): void {
    this._calmDays = 0;
  }
}
