const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * What can go wrong with someone on board. The same model serves the crew, the cats, the hens and
 * any character added later ("one health": one sickbay for people and animals, as in Cold Sanctuary).
 */
export type ConditionKind = "herida" | "contusion" | "intoxicacion" | "absceso" | "estres-agudo";

export interface Condition {
  readonly id: string;
  readonly kind: ConditionKind;
  /** 0 healed … 1 critical. */
  readonly severity: number;
  /** What happened, shown as the scenario ("Luna y Nube se pelearon"). */
  readonly cause: string;
  readonly treated: boolean;
  /** Days since it started. */
  readonly ageDays: number;
}

/** Game tuning (not measured): how conditions evolve with and without care. Time in days. */
export const MEDICAL_TUNING = {
  healPerDayTreated: 0.25,
  worsenPerDayUntreated: 0.04,
  /** An untreated bite wound turns into an abscess after this many days (cat bites often abscess). */
  abscessAfterDays: 3,
  /** From this severity the patient must lie in the sickbay to recover. */
  bedFrom: 0.6,
} as const;

type MutableCondition = { -readonly [K in keyof Condition]: Condition[K] } & { bite: boolean };

/** Conditions of one living being. Healing needs treatment first; then it heals with rest. */
export class Health {
  private readonly list: MutableCondition[] = [];
  private seq = 0;

  constructor(readonly ownerId: string) {}

  get conditions(): readonly Condition[] {
    return this.list;
  }
  /** Worst current condition, 0 when healthy. */
  get burden(): number {
    return this.list.reduce((m, c) => Math.max(m, c.severity), 0);
  }
  get needsBed(): boolean {
    return this.list.some((c) => c.severity >= MEDICAL_TUNING.bedFrom);
  }
  get untreated(): readonly Condition[] {
    return this.list.filter((c) => !c.treated);
  }

  /** Adds a condition; `bite` marks wounds that can turn into an abscess. */
  add(kind: ConditionKind, severity: number, cause: string, bite = false): Condition {
    const c: MutableCondition = { id: `${this.ownerId}-${kind}-${++this.seq}`, kind, severity: clamp01(severity), cause, treated: false, ageDays: 0, bite };
    this.list.push(c);
    return c;
  }

  treat(conditionId: string): void {
    const c = this.list.find((x) => x.id === conditionId);
    if (!c) throw new Error(`Unknown condition ${conditionId}`);
    c.treated = true;
  }

  /** Returns conditions that appeared during this tick (an abscess from an untreated bite). */
  tick(dtDays: number): Condition[] {
    const t = MEDICAL_TUNING;
    const born: Condition[] = [];
    for (const c of [...this.list]) {
      c.ageDays += dtDays;
      c.severity = clamp01(c.severity + (c.treated ? -t.healPerDayTreated : t.worsenPerDayUntreated) * dtDays);
      if (c.bite && !c.treated && c.ageDays >= t.abscessAfterDays) {
        c.bite = false;
        born.push(this.add("absceso", Math.max(0.5, c.severity), `${c.cause}: la mordedura sin curar se infectó`));
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i]!.severity <= 0) this.list.splice(i, 1);
    return born;
  }
}

/** Anyone the sickbay can look after. */
export interface Patient {
  readonly id: string;
  readonly name: string;
  readonly kind: "humano" | "gato" | "gallina" | (string & {});
  readonly health: Health;
}
