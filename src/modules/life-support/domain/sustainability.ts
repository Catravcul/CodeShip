import type { Sourced } from "@core/units";

/**
 * About 40–50 m² of crops under high light feed one person (dietary calories) and also make all
 * the O2 and remove the CO2 that person needs (Wheeler et al. 2021, a review of NASA research).
 * Early missions may have under 5 m².
 */
export const CROP_AREA_PER_PERSON: Sourced<readonly [number, number]> = {
  value: [40, 50],
  source: "https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2021.734343/full",
};

/**
 * Energy requirement for women 19 y and older, NASA JSC-67378 (2020):
 * EER = 354 − 6.91·age + PA·(9.36·kg + 726·m). PA = 1.11 ("low active"); with exercise equipment
 * and time it reverts to 1.25. Doménica does yoga every day, so 1.25.
 */
export const CREW_ENERGY: Sourced<(age: number, kg: number, m: number) => number> = {
  value: (age, kg, m) => 354 - 6.91 * age + 1.25 * (9.36 * kg + 726 * m),
  source: "https://ntrs.nasa.gov/api/citations/20205008306/downloads/JSC67378%20Expl%20Nutr%20Reqs%20042020.pdf",
};

/** A laying hen eats about 110 g of feed a day at about 2.9 kcal ME per gram (NRC laying-hen diets). */
export const HEN_FEED_KCAL: Sourced<number> = {
  value: 110 * 2.9,
  source: "https://nap.nationalacademies.org/catalog/2114/nutrient-requirements-of-poultry-ninth-revised-edition-1994",
  note: "110 g/day is the same order of magnitude as HEN_TUNING.feedPerHenG.",
};

export interface Eater {
  readonly name: string;
  readonly kcal: number;
}

export interface Sustainability {
  /** Growing area in use, m². */
  readonly areaM2: number;
  /** Area needed to feed everyone, m². */
  readonly neededM2: number;
  /** areaM2 / neededM2: 1 or more means the trip feeds itself. */
  readonly ratio: number;
  readonly kcalPerDay: number;
}

/**
 * Area needed for everyone on board, scaling the per-person figure by each eater's energy relative
 * to the crew member's. Feeding animals from crops or via the bioreactor's medium loses energy on
 * the way, so this is a lower bound.
 */
export function selfSufficiency(areaM2: number, eaters: readonly Eater[], crewKcal: number): Sustainability {
  const [lo, hi] = CROP_AREA_PER_PERSON.value;
  const perPerson = (lo + hi) / 2;
  const kcalPerDay = eaters.reduce((s, e) => s + e.kcal, 0);
  const neededM2 = (perPerson * kcalPerDay) / crewKcal;
  return { areaM2, neededM2, ratio: areaM2 / neededM2, kcalPerDay };
}
