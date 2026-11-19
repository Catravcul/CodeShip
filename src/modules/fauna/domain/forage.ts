/**
 * PLANTS AS COUNTABLE FOOD (docs/design/fauna.md, «plantas como comida contable»; sanctuary 3's biome,
 * docs/design/bioma-s3.md). Cold Sanctuary's FoodChain counts what a plant regrows in a year (`PlantYield`) and what
 * the eaters take; here the same as a living stock: a plant (or the phytoplankton, or a bank of krill seen as food)
 * is kilograms that grow by the season, limited by the light of the day and the warmth, up to what the place holds,
 * and that its eaters take, never below a refuge that keeps it from vanishing. Pure; no sanctuary data.
 */

/** Hours of daylight at latitude `latDeg` (south negative) on day `dayOfYear` (0 = 1 January): the CBM model (Forsythe et al. 1995, Ecological Modelling 80:87). */
export function daylightHours(latDeg: number, dayOfYear: number): number {
  const theta = 0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.0086 * (dayOfYear + 1 - 186)));
  const phi = Math.asin(0.39795 * Math.cos(theta));
  const lat = (latDeg * Math.PI) / 180;
  const p = 0.8333;
  const x = (Math.sin((p * Math.PI) / 180) + Math.sin(lat) * Math.sin(phi)) / (Math.cos(lat) * Math.cos(phi));
  return 24 - (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, x)));
}

/** Maximum growth rate of phytoplankton at `tempC` (per day): Eppley 1972, Fishery Bulletin 70:1063 (0,59·e^(0,0633·T)). */
export const eppley = (tempC: number): number => 0.59 * Math.exp(0.0633 * tempC);

/**
 * How much a plant can grow now, 0–1: the day's light (12 h of light or more = 1) times the warmth above its minimum
 * (full 8 °C above it; ours, the shape of a cold-limited growth curve).
 */
export function seasonFactor(daylightH: number, tempC: number, minTempC: number): number {
  const light = Math.max(0, Math.min(1, daylightH / 12));
  const warm = Math.max(0, Math.min(1, (tempC - minTempC) / 8));
  return light * warm;
}

/**
 * The top growth rate (per day) that gives a plant its annual production over biomass (`perYear`, P/B) at half its
 * stock, when the season factor averages `meanFactor` over the year: logistic growth produces r·f·B·(1 − B/K), so at
 * B = K/2 the yearly P/B is 365·r·f̄/2.
 */
export const rateFor = (perYear: number, meanFactor: number): number => (2 * perYear) / (365 * Math.max(1e-6, meanFactor));

/** Stock `kg` after `dtDays` of logistic growth at rate `r·factor` up to `capKg` (the exact solution: no overshoot). */
export function grow(kg: number, capKg: number, r: number, factor: number, dtDays: number): number {
  if (kg <= 0 || capKg <= 0) return Math.max(0, kg);
  const rt = r * factor * dtDays;
  if (rt <= 0) return Math.min(kg, capKg);
  return capKg / (1 + ((capKg - kg) / kg) * Math.exp(-rt));
}

/** The most of what is above the refuge that eaters can take in `dtDays` (half of it in about a day: they cannot find it all at once). */
export const takeable = (kg: number, refugeKg: number, dtDays: number): number => Math.max(0, kg - refugeKg) * (1 - Math.exp(-0.7 * dtDays));

/**
 * Shares a stock out among its eaters' demands (kg): each gets the same fraction of what it asked, all of it if there
 * is enough. Returns that fraction and what is left.
 */
export function graze(kg: number, refugeKg: number, demand: number, dtDays: number): { fed: number; left: number } {
  if (demand <= 0) return { fed: 1, left: kg };
  const can = takeable(kg, refugeKg, dtDays);
  const take = Math.min(can, demand);
  return { fed: take / demand, left: kg - take };
}

/** The mean of `f` over a year of days 0–364 (for `rateFor`). */
export function yearMean(f: (dayOfYear: number) => number): number {
  let s = 0;
  for (let d = 0; d < 365; d++) s += f(d);
  return s / 365;
}
