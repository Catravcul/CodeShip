import { earthToRegion, type EarthToRegion } from "./transfer";
import { leoKgPerKgDelivered } from "./rocket";
import { USD_PER_CREDIT } from "./wallet";

/** What an order to the Sanctuary costs and how long it takes. */
export interface ImportQuote {
  /** Mass delivered, kg. */
  readonly massKg: number;
  readonly transfer: EarthToRegion;
  /** kg launched to LEO per kg delivered (the rocket equation, two dropped stages). */
  readonly leoKgPerKg: number;
  readonly leoKg: number;
  readonly usdPerKgLeo: number;
  readonly usd: number;
  /** Price in créditos (rounded up). */
  readonly credits: number;
  /** Real Hohmann transfer time, days. */
  readonly transitDays: number;
  /** Delay on the station clock, game hours. */
  readonly gameHours: number;
}

/**
 * The in-game import formula (docs/design/importacion.md):
 * créditos = ⌈ masa × (kg en LEO por kg entregado) × (US$/kg a LEO) / 1 000 ⌉,
 * where the multiplier comes from the two burns of a Hohmann transfer from LEO to the region at the
 * transfer stage's Isp; the delay is the transfer's days × game hours per day.
 */
export function importQuote(massKg: number, usdPerKgLeo: number, regionAU: number, stage: { ispS: number; tankage: number }, gameHoursPerDay: number): ImportQuote {
  const transfer = earthToRegion(regionAU);
  const leoKgPerKg = leoKgPerKgDelivered([transfer.departMs, transfer.arriveMs], stage.ispS, stage.tankage);
  const leoKg = massKg * leoKgPerKg;
  const usd = leoKg * usdPerKgLeo;
  return { massKg, transfer, leoKgPerKg, leoKg, usdPerKgLeo, usd, credits: Math.ceil(usd / USD_PER_CREDIT - 1e-9), transitDays: transfer.days, gameHours: transfer.days * gameHoursPerDay };
}
