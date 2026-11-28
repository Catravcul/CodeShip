import { monthOf, type LifeCycle, type Stage } from "./life-cycle";
import { hash01 } from "./roam";

/**
 * ESTRUS AND COURTSHIP (Cold Sanctuary's EstrusState and its «mate» desire, Assets/Animals/DesireCatalog.cs: «en celo,
 * dirigirse a otras animas en celo», weight 0.6). The season comes from the species' real calendar: conception is a
 * gestation before the births (delayed implantation included, so a polar bear mates in spring for December births),
 * and only adults are in estrus. A pair courts for a while (each species' real display, from its data) and the female
 * is pregnant: her young is born in the birth season.
 */
export type Sex = "hembra" | "macho";

/** Cold Sanctuary's weight of the mating desire: under strong hunger, over the habits. */
export const W_MATE = 0.6;
/** How long a courtship lasts, s (a display, then the mating). */
export const COURT_S = 20;
/** Days the estrus lasts in its season (ours, a month: some are shorter, a few longer). */
export const ESTRUS_DAYS = 30;

/** A fixed sex for an animal without one in its data. */
export const sexOf = (id: number): Sex => (hash01(id, 11) < 0.5 ? "hembra" : "macho");

/** The month (1–12) its species mates: a gestation before its births. */
export function matingMonth(c: LifeCycle): number {
  const m = (((c.birthMonth - 1 - Math.round(c.gestationMonths)) % 12) + 12) % 12;
  return m + 1;
}

/** Is an animal of this cycle and stage in estrus on game day `day`? */
export function inEstrus(day: number, c: LifeCycle, yearDay0: number, stage: Stage): boolean {
  return (stage === "adulto" || stage === "anciano") && monthOf(day, yearDay0) === matingMonth(c);
}
