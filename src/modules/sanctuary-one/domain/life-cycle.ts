/**
 * The life cycle of each animal (Berón 2026-11-19: «¿se ha revisado que los animales cumplan sus ciclos de vida
 * reales?»): Cold Sanctuary's StageProfile (3 stages and their days, Assets/Animals/StageProfile.cs) and
 * Reproduction.Calendar (gestation and the interval between births), with a growth curve from the real size at
 * birth. data/ciclos-de-vida.ts holds each species' numbers and their sources.
 */
export interface LifeCycle {
  /** Days of each stage, one after another (Cold Sanctuary's childDays, teenDays, adultDays). */
  readonly childDays: number;
  readonly teenDays: number;
  readonly adultDays: number;
  /** Length at birth over the adult's. */
  readonly birthSize: number;
  readonly gestationMonths: number;
  /** Months between two births of the same mother. */
  readonly intervalMonths: number;
  /** Month of the births in the wild (1 = January). */
  readonly birthMonth: number;
}

export type Stage = "cria" | "joven" | "adulto" | "anciano";
export const STAGE_LABEL: Readonly<Record<Stage, string>> = { cria: "cría", joven: "joven", adulto: "adulto", anciano: "anciano" };

/** The last fifth of adulthood is old age. */
const OLD_FROM = 0.8;

export function stageOf(ageDays: number, c: LifeCycle): Stage {
  if (ageDays < c.childDays) return "cria";
  if (ageDays < c.childDays + c.teenDays) return "joven";
  return ageDays < c.childDays + c.teenDays + c.adultDays * OLD_FROM ? "adulto" : "anciano";
}

/** Size over the adult's (von Bertalanffy): from `birthSize` to 95 % when it comes of age. */
export function sizeAt(ageDays: number, c: LifeCycle): number {
  const k = -Math.log(0.05) / (c.childDays + c.teenDays);
  return 1 - (1 - c.birthSize) * Math.exp(-k * Math.max(0, ageDays));
}

/**
 * The age (days) of the `i`-th of a family of `n`, fixed on every load: half or more are adults of spread ages; the
 * rest are the young of past birth seasons, one season apart by the species' interval between births.
 */
export function ageInGroup(i: number, n: number, c: LifeCycle): number {
  const adults = Math.max(1, Math.ceil(n / 2));
  const adultSpan = c.adultDays * OLD_FROM + c.adultDays * (1 - OLD_FROM) * 0.5;
  if (i < adults) return Math.round(c.childDays + c.teenDays + ((i + 0.5) / adults) * adultSpan);
  const season = (i - adults) * (c.intervalMonths / 12) * 365;
  const young = c.childDays + c.teenDays;
  // The youngest is a fifth into its childhood; the next ones a birth interval older each, kept under adulthood.
  return Math.round(Math.min(young - 1, c.childDays * 0.2 + season));
}
